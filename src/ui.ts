import { analyze } from './analysis.ts';
import { type en, Localization } from './l10n.ts';
import type { Candidate, Plan, Position, Proposal, Selection } from './model.ts';
import type { TransferService } from './transfer.ts';
import type { ZoteroAdapter } from './zotero.ts';

export class TransferWindow {
  private plan: Plan | null = null;
  private controller: AbortController | null = null;
  private readonly accepted = new Map<string, string>();
  private readonly skipped = new Set<string>();
  private activeIndex = 0;
  private previewVersion = 0;
  private applying = false;
  private closed = false;
  private readonly l10n: Localization;
  private readonly win: Window;
  private readonly adapter: ZoteroAdapter;
  private readonly service: TransferService;
  constructor(win: Window, adapter: ZoteroAdapter, service: TransferService) {
    this.win = win;
    this.adapter = adapter;
    this.service = service;
    this.l10n = new Localization(adapter.locale());
  }
  private t(key: keyof typeof en, params: Record<string, string | number> = {}): string {
    return this.l10n.t(key, params);
  }
  private el<T extends HTMLElement>(id: string): T {
    return this.win.document.getElementById(id) as T;
  }
  private text(id: string, value: string): void {
    this.el(id).textContent = value;
  }
  private status(value: string): void {
    this.text('status', this.l10n.message(value));
  }
  private handle(work: () => Promise<void>): () => void {
    return () => {
      void work().catch((e) => {
        this.status(e instanceof Error ? e.message : String(e));
        this.adapter.log(e);
      });
    };
  }
  async init(ids: number[]): Promise<void> {
    this.l10n.apply(this.win.document);
    this.reviewSet();
    this.languageState();
    for (const locale of ['en', 'ru'] as const) {
      this.el<HTMLButtonElement>(`language-${locale}`).onclick = this.handle(async () => {
        if (this.applying || this.controller || this.l10n.locale === locale) return;
        this.l10n.locale = locale;
        this.languageState();
        this.l10n.apply(this.win.document);
        this.renderList();
        await this.show();
        this.status(
          this.plan ? this.t('analyzed', { count: this.plan.proposals.length }) : this.t('ready'),
        );
        if (this.plan?.state === 'applied')
          this.text('apply-result', this.t('applied', { count: this.accepted.size }));
      });
    }
    const choices = await this.adapter.choices(ids);
    for (const id of ['old', 'new']) {
      const select = this.el<HTMLSelectElement>(id);
      for (const choice of choices) {
        const option = this.win.document.createElement('option');
        option.value = String(choice.id);
        option.textContent = choice.title;
        select.append(option);
      }
    }
    if (choices.length > 1) this.el<HTMLSelectElement>('new').selectedIndex = 1;
    this.el('analyze').onclick = this.handle(() => this.runAnalysis());
    this.el('cancel').onclick = () => {
      this.controller?.abort();
      this.status(this.t('cancelling'));
    };
    this.el('swap').onclick = () => {
      if (this.applying || this.controller) return;
      const old = this.el<HTMLSelectElement>('old'),
        target = this.el<HTMLSelectElement>('new');
      [old.value, target.value] = [target.value, old.value];
      this.clearPlan();
    };
    for (const id of ['old', 'new']) this.el(id).onchange = () => this.clearPlan();
    this.el('accept').onclick = () => this.accept();
    this.el('skip').onclick = () => {
      const p = this.current();
      if (!p) return;
      this.accepted.delete(p.source.key);
      this.skipped.add(p.source.key);
      this.renderList();
      this.next();
    };
    this.el('accept-unique').onclick = () => {
      for (const p of this.plan?.proposals ?? []) {
        if (p.recommendedID && p.status === 'unique candidate' && !this.skipped.has(p.source.key))
          this.accepted.set(p.source.key, p.recommendedID);
      }
      this.renderList();
      this.reviewSet();
      this.status(this.t('uniqueSelected'));
    };
    this.el('apply').onclick = this.handle(() => this.apply());
    this.el('undo').onclick = this.handle(async () => {
      if (this.applying || this.controller) return;
      if (!this.win.confirm(this.t('undoConfirm'))) return;
      this.lock(true);
      try {
        const result = await this.service.undoLast();
        this.clearPlan();
        this.status(this.t('undone', { count: result.count }));
      } finally {
        this.lock(false);
      }
    });
    this.win.addEventListener('unload', () => {
      this.closed = true;
      this.controller?.abort();
      this.previewVersion++;
    });
    await this.service.journal();
    this.status(choices.length >= 2 ? this.t('ready') : this.t('choosePair'));
  }
  private languageState(): void {
    for (const locale of ['en', 'ru'] as const)
      this.el(`language-${locale}`).setAttribute(
        'aria-pressed',
        String(this.l10n.locale === locale),
      );
  }
  private lock(value: boolean): void {
    this.applying = value;
    for (const id of [
      'language-en',
      'language-ru',
      'old',
      'new',
      'swap',
      'analyze',
      'undo',
      'accept-unique',
      'accept',
      'skip',
      'apply',
      'candidates',
    ])
      this.el<HTMLButtonElement>(id).disabled = value;
    if (!value) {
      this.reviewSet();
      const reviewing = this.plan?.state === 'review';
      this.el<HTMLButtonElement>('accept-unique').disabled = !reviewing;
      this.el<HTMLButtonElement>('accept').disabled = !reviewing || !this.chosen()?.position;
      this.el<HTMLButtonElement>('skip').disabled = !reviewing || !this.current();
      this.el<HTMLSelectElement>('candidates').disabled =
        !reviewing || !this.current()?.candidates.length;
    }
  }
  private clearPlan(): void {
    this.plan = null;
    this.accepted.clear();
    this.skipped.clear();
    this.previewVersion++;
    this.el('list').replaceChildren();
    this.el('review').replaceChildren();
    this.text('selected-count', this.t('selected', { count: 0 }));
    this.el('detail').hidden = true;
    this.text('apply-result', '');
    this.el('open-result').hidden = true;
    this.el<HTMLButtonElement>('apply').disabled = true;
    this.el<HTMLButtonElement>('accept-unique').disabled = true;
  }
  private async runAnalysis(): Promise<void> {
    if (this.controller || this.applying) return;
    this.clearPlan();
    this.lock(true);
    const controller = this.adapter.controller();
    this.controller = controller;
    this.el<HTMLButtonElement>('cancel').disabled = false;
    try {
      this.plan = await analyze(
        this.adapter,
        Number(this.el<HTMLSelectElement>('old').value),
        Number(this.el<HTMLSelectElement>('new').value),
        controller.signal,
        (value) => this.status(value),
      );
      if (this.closed) return;
      this.activeIndex = 0;
      this.renderList();
      await this.show();
      controller.signal.throwIfAborted();
      this.status(this.t('analyzed', { count: this.plan.proposals.length }));
    } catch (e) {
      this.clearPlan();
      this.status(
        controller.signal.aborted
          ? this.t('cancelled')
          : this.t('analysisFailed', {
              error: this.l10n.message(e instanceof Error ? e.message : String(e)),
            }),
      );
      if (!controller.signal.aborted) this.adapter.log(e);
    } finally {
      this.controller = null;
      this.lock(false);
      this.el<HTMLButtonElement>('cancel').disabled = true;
      this.el<HTMLButtonElement>('accept-unique').disabled = !this.plan;
      // Initializing a native PDF tab can bring the main window forward.
      if (!this.closed) this.win.focus();
    }
  }
  private current(): Proposal | undefined {
    return this.plan?.proposals[this.activeIndex];
  }
  private chosen(): Candidate | undefined {
    return this.current()?.candidates.find(
      (c) => c.id === this.el<HTMLSelectElement>('candidates').value,
    );
  }
  private renderList(): void {
    const list = this.el('list');
    list.replaceChildren();
    for (const [index, p] of (this.plan?.proposals ?? []).entries()) {
      const button = this.win.document.createElement('button');
      button.className = 'annotation-row';
      button.setAttribute('aria-current', String(index === this.activeIndex));
      const title = this.win.document.createElement('span');
      title.textContent = p.source.text || this.t('type', { type: p.source.type });
      const state = this.win.document.createElement('small');
      state.textContent = `${this.accepted.has(p.source.key) ? this.t('accepted') : this.skipped.has(p.source.key) ? this.t('skipped') : ''}${this.t(p.status)}`;
      button.append(title, state);
      button.onclick = this.handle(async () => {
        this.activeIndex = index;
        this.renderList();
        await this.show();
      });
      list.append(button);
    }
    this.reviewSet();
  }
  private reviewSet(): void {
    const review = this.el('review');
    review.replaceChildren();
    for (const [key, id] of this.accepted) {
      const proposal = this.plan?.proposals.find((p) => p.source.key === key),
        c = proposal?.candidates.find((x) => x.id === id);
      if (!proposal || !c) continue;
      const line = this.win.document.createElement('li');
      line.textContent = this.t('reviewLine', {
        old: proposal.source.pageLabel ?? proposal.source.position.pageIndex + 1,
        new: c.pageLabel,
        text: c.text.slice(0, 110),
      });
      const remove = this.win.document.createElement('button');
      remove.className = 'remove';
      remove.textContent = this.t('remove');
      remove.setAttribute(
        'aria-label',
        this.t('removeLabel', { text: proposal.source.text.slice(0, 50) }),
      );
      remove.onclick = () => {
        this.accepted.delete(key);
        this.renderList();
      };
      line.append(remove);
      review.append(line);
    }
    this.text('selected-count', this.t('selected', { count: this.accepted.size }));
    this.el<HTMLButtonElement>('apply').disabled =
      this.applying || !this.accepted.size || this.plan?.state !== 'review';
  }
  private async show(): Promise<void> {
    const p = this.current();
    this.el('detail').hidden = !p;
    if (!p || !this.plan) return;
    this.text('source-text', p.source.text);
    this.text('comment', p.source.comment || this.t('noComment'));
    this.text(
      'metadata',
      this.t('metadata', {
        type: p.source.type,
        color: p.source.color,
        tags: p.source.tags.join(', ') || this.t('noTags'),
      }),
    );
    this.text('source-context', `${p.sourcePrefix}【${p.source.text}】${p.sourceSuffix}`);
    this.text(
      'source-page',
      this.t('sourcePage', { page: p.source.pageLabel ?? p.source.position.pageIndex + 1 }),
    );
    this.text('outcome', `${this.t(p.status)}: ${this.l10n.message(p.reason)}`);
    const select = this.el<HTMLSelectElement>('candidates');
    select.replaceChildren();
    if (p.status === 'multiple candidates' && !this.accepted.has(p.source.key)) {
      const placeholder = this.win.document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = this.t('chooseCandidate');
      placeholder.disabled = true;
      select.append(placeholder);
    }
    for (const [index, c] of p.candidates.entries()) {
      const option = this.win.document.createElement('option');
      option.value = c.id;
      option.textContent = `${p.candidates.length > 1 ? this.t('variant', { index: index + 1 }) : ''}${this.t('candidate', { page: c.pageLabel, method: this.t(c.method) })}${c.contextMatches ? this.t('contextMatch') : ''}${c.geometryError ? this.t('noGeometry') : ''}`;
      select.append(option);
    }
    select.value =
      this.accepted.get(p.source.key) ??
      p.recommendedID ??
      (p.status === 'multiple candidates' ? '' : (p.candidates[0]?.id ?? ''));
    select.onchange = this.handle(async () => {
      // Changing an alternative revokes the old confirmation until Accept is clicked again.
      this.accepted.delete(p.source.key);
      this.renderList();
      await this.previews();
    });
    this.el('open-source').onclick = this.handle(async () => {
      if (this.plan)
        await this.adapter.navigate(this.plan.source.id, p.source.position, p.source.key);
    });
    this.el('open-target').onclick = this.handle(async () => {
      const c = this.chosen();
      if (c?.position && this.plan) await this.adapter.navigate(this.plan.target.id, c.position);
    });
    await this.previews();
  }
  private async previews(): Promise<void> {
    const p = this.current(),
      c = this.chosen(),
      plan = this.plan;
    if (!p || !plan) return;
    const version = ++this.previewVersion;
    this.el<HTMLButtonElement>('accept').disabled =
      this.applying || !c?.position || plan.state !== 'review';
    this.el<HTMLButtonElement>('open-target').disabled = !c?.position;
    this.text(
      'target-page',
      c
        ? this.t('targetPage', { page: c.pageLabel, sheet: c.pageIndex + 1 })
        : p.candidates.length
          ? this.t('chooseTarget')
          : this.t('noTarget'),
    );
    this.text('target-context', c ? `${c.prefix}【${c.text}】${c.suffix}` : '');
    this.text('geometry', c?.geometryError ? this.l10n.message(c.geometryError) : '');
    for (const side of ['source', 'target']) {
      this.el<HTMLImageElement>(`${side}-preview`).removeAttribute('src');
      this.text(`${side}-preview-status`, this.t('loading'));
    }
    const render = async (side: string, attachmentID: number, position: Position) => {
      try {
        const data = await this.adapter.preview(
          attachmentID,
          position,
          p.source.color,
          p.source.type,
        );
        if (version !== this.previewVersion || this.closed) return;
        this.el<HTMLImageElement>(`${side}-preview`).src = data;
        this.text(`${side}-preview-status`, '');
      } catch (e) {
        if (version === this.previewVersion)
          this.text(
            `${side}-preview-status`,
            this.t('previewFailed', { error: this.l10n.message(String(e)) }),
          );
      }
    };
    const jobs = [render('source', plan.source.id, p.source.position)];
    if (c?.position) jobs.push(render('target', plan.target.id, c.position));
    else this.text('target-preview-status', this.t('noPreview'));
    await Promise.all(jobs);
  }
  private accept(): void {
    const p = this.current(),
      c = this.chosen();
    if (this.applying || this.controller || !p || !c?.position || this.plan?.state !== 'review')
      return;
    this.accepted.set(p.source.key, c.id);
    this.skipped.delete(p.source.key);
    this.renderList();
    this.next();
  }
  private next(): void {
    if (this.activeIndex + 1 < (this.plan?.proposals.length ?? 0)) {
      this.activeIndex++;
      this.renderList();
      void this.show().catch((e) => this.status(String(e)));
    }
  }
  private async apply(): Promise<void> {
    if (!this.plan || this.applying || this.controller || !this.accepted.size) return;
    const selections: Selection[] = [...this.accepted].map(([sourceKey, candidateID]) => ({
      sourceKey,
      candidateID,
    }));
    if (
      !this.win.confirm(
        this.t('applyConfirm', { count: selections.length, title: this.plan.target.title }),
      )
    )
      return;
    this.lock(true);
    this.status(this.t('writing'));
    try {
      const record = await this.service.apply(this.plan, selections);
      this.status(this.t('created', { count: record.created.length }));
      this.text('apply-result', this.t('applied', { count: record.created.length }));
      const first = record.copies[0];
      this.el<HTMLButtonElement>('open-result').hidden = !first;
      this.el('open-result').onclick = this.handle(async () => {
        if (first) await this.adapter.navigate(record.targetID, first.position, first.key);
      });
    } finally {
      this.lock(false);
      this.el<HTMLButtonElement>('accept-unique').disabled = this.plan.state !== 'review';
    }
  }
}
