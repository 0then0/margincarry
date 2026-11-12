import type { Message, UiKey } from './en.ts';

export const ui: Record<UiKey, string> = {
  title: 'MarginCarry · transferência de anotações em PDF',
  menu: 'MarginCarry: transferir anotações em PDF…',
  noteCopyMenu: 'MarginCarry: copiar nota com links para o novo PDF…',
  noteCopyTitle: 'Copiar nota com links para o novo PDF',
  noteCopyOperation: 'Transferência concluída',
  noteCopyPreview: 'Prévia dos links',
  noteCopySave: 'Salvar uma cópia',
  noteCopyOpen: 'Mostrar a nota copiada',
  noteCopyReview: 'Confira os links e salve a cópia.',
  noteCopyNoOperations: 'O item ao qual esta nota pertence não tem transferências concluídas.',
  noteCopyNoPair: 'p. {page} · Sem correspondência confirmada · {text}',
  noteCopyCreated: 'A cópia da nota foi salva.',
  subtitle: 'Suas anotações em uma nova versão do PDF. Revise cada posição antes de gravar.',
  language: 'Idioma',
  direction: 'Direção da transferência',
  old: 'PDF antigo',
  new: 'PDF novo',
  swap: 'Inverter direção',
  analyze: 'Buscar propostas',
  cancel: 'Cancelar análise',
  preparing: 'Preparando…',
  annotations: 'Anotações',
  unique: 'Selecionar as únicas',
  sourceList: 'Anotações de origem',
  proposal: 'Posição proposta',
  source: 'Origem',
  target: 'Destino',
  openSource: 'Abrir origem no leitor',
  openTarget: 'Abrir destino no leitor',
  sourceImage: 'Seleção de origem na página real do PDF',
  targetImage: 'Seleção proposta na página real do PDF',
  accept: 'Aceitar proposta',
  skip: 'Ignorar',
  selectionOnly: 'Selecionar não grava nada.',
  selected: 'Selecionadas para gravar: {count}',
  apply: 'Aplicar seleção',
  undo: 'Desfazer última transferência',
  review: 'Transferências selecionadas',
  openResult: 'Abrir a anotação criada',
  links:
    'As cópias recebem chaves novas. Os links das notas existentes continuam abrindo as anotações originais.',
  cancelling: 'Cancelando a análise…',
  cancelled: 'Análise cancelada. Nada foi gravado.',
  ready:
    'Escolha a direção da transferência e inicie a análise. Nenhuma anotação é gravada automaticamente.',
  choosePair:
    'Feche esta janela e selecione dois anexos em PDF do mesmo item, ou o item bibliográfico.',
  uniqueSelected: 'Propostas únicas selecionadas. Revise o conjunto antes de aplicar.',
  undoConfirm:
    'Desfazer a última transferência? Somente as cópias dela irão para a Lixeira. Se alguma cópia tiver sido editada, ocorrerá um conflito e nada será desfeito.',
  undone: 'Transferência desfeita: {count} cópias movidas para a Lixeira.',
  analyzed: 'Anotações contabilizadas: {count}. Revise o PDF antes de aceitar as propostas.',
  analysisFailed: 'A análise não foi concluída: {error}. As propostas não podem ser aplicadas.',
  type: 'Tipo: {type}',
  typeHighlight: 'destaque',
  typeUnderline: 'sublinhado',
  typeNote: 'nota',
  typeImage: 'imagem',
  typeInk: 'desenho',
  typeText: 'texto',
  accepted: 'Selecionada · ',
  skipped: 'Ignorada · ',
  'unique candidate': 'Candidato único',
  'multiple candidates': 'Vários candidatos',
  'doubtful candidate': 'Candidato duvidoso',
  'not found': 'Não encontrado',
  unsupported: 'Não compatível',
  'processing error': 'Erro de processamento',
  reviewLine: 'p. {old} → {new} · {text}',
  remove: 'Remover',
  removeLabel: 'Remover: {text}',
  noComment: 'Sem comentário',
  metadata: '{type} · cor {color} · etiquetas: {tags}',
  noTags: 'nenhuma',
  sourcePage: 'Origem · página {page}',
  chooseCandidate: 'Escolha um candidato para revisar…',
  variant: 'Candidato {index} · ',
  candidate: 'Página {page} · {method}',
  exact: 'exata',
  normalized: 'normalizada',
  contextMatch: ' · o contexto coincide',
  outcome: '{status}: {reason}',
  boundaryDiffers: ' · o limite da palavra ou do número é diferente',
  noGeometry: ' · sem coordenadas confiáveis',
  targetPage: 'Destino · página {page} (folha {sheet})',
  chooseTarget: 'Escolha um local de destino',
  noTarget: 'Nenhum local de destino',
  loading: 'Carregando PDF…',
  previewFailed: 'Pré-visualização indisponível: {error}. Abra o local no leitor.',
  noPreview: 'Não há local verificado para pré-visualizar.',
  sourcePages: 'Origem · páginas {page}',
  targetPages: 'Destino · páginas {page} (folhas {sheet})',
  candidatePages: 'Páginas {page} · {method}',
  nextPage: 'Continua na página {page}',
  openSourceNext: 'Abrir origem na página seguinte',
  openTargetNext: 'Abrir destino na página seguinte',
  sourceImageNext: 'Continuação da seleção de origem na página seguinte do PDF',
  targetImageNext: 'Continuação da seleção proposta na página seguinte do PDF',
  applyConfirm:
    'Aplicar a seleção ({count}) em “{title}”? As anotações originais são mantidas. As cópias recebem chaves novas.',
  writing: 'Verificando alterações e gravando…',
  created: 'Anotações do Zotero criadas: {count}. A transferência foi salva no registro local.',
  applied: 'Transferidas: {count}. Abra o PDF novo ou desfaça a última transferência.',
  sourceProgress: 'Páginas de origem: {current}/{total}',
  targetProgress: 'Páginas de destino: {current}/{total}',
  annotationProgress: 'Anotações: {current}/{total}',
  extractionFailed: 'Não foi possível extrair o texto do PDF: {error}',
  limit: 'Lista limitada a {limit} candidatos; não se sabe se o candidato é único.',
  incompletePage: 'A página {page} tem dados de extração incompletos.',
  duplicate:
    'A anotação de origem {key} já foi transferida. Desfaça essa operação antes de copiá-la novamente.',
  conflict:
    'Conflito ao desfazer: {keys} foi editada, movida ou excluída. Nenhuma cópia foi removida.',
};

export const messages: Record<Message, string> = {
  'Choose one child note in your personal library.':
    'Selecione uma nota filha na sua biblioteca pessoal.',
  'The selected transfer is no longer available for this note.':
    'A transferência selecionada não está mais disponível para esta nota.',
  'The note changed after the preview. Refresh the preview and try again.':
    'A nota mudou após a prévia. Atualize a prévia e tente novamente.',
  'The transfer links changed after the preview. Refresh the preview and try again.':
    'Os links da transferência mudaram após a prévia. Atualize a prévia e tente novamente.',
  'An embedded image in the source note is unavailable locally.':
    'Uma imagem incorporada à nota original não está disponível localmente.',
  'There are no confirmed links to copy.':
    'Não há links com correspondência confirmada para copiar.',
  'Only native highlights and underlines are supported.':
    'Somente destaques e sublinhados nativos do Zotero são compatíveis.',
  'The source page could not be extracted.': 'Não foi possível extrair a página de origem.',
  'The second source page could not be extracted.':
    'Não foi possível extrair a segunda página de origem.',
  'Empty source text.': 'O texto de origem está vazio.',
  'The target PDF has no usable text layer. OCR is not supported.':
    'O PDF de destino não tem uma camada de texto utilizável. O OCR não é compatível.',
  'No exact or conservatively normalized quote on one target page or across two adjacent target pages.':
    'Nenhuma citação exata ou normalizada de forma conservadora em uma página de destino nem entre duas páginas de destino consecutivas.',
  'One occurrence matches the complete available context; alternatives are retained.':
    'Uma ocorrência coincide com todo o contexto disponível; as alternativas foram mantidas.',
  'One text occurrence; verify the PDF position.':
    'Uma ocorrência do texto; verifique a posição no PDF.',
  'One text occurrence; word boundaries cannot be checked for this script. Verify the PDF position.':
    'Uma ocorrência do texto; os limites de palavra não podem ser verificados nesta escrita. Verifique a posição no PDF.',
  'The quote occurs only where the word or number boundary differs from the source selection; no transfer is recommended. Check the PDF before choosing one manually.':
    'A citação só aparece onde o limite da palavra ou do número difere da seleção de origem; nenhuma transferência é recomendada. Confira o PDF antes de escolher uma manualmente.',
  'Several occurrences require a human choice.': 'Escolha manualmente a ocorrência correta.',
  'Text found, but none of the occurrences has reliable geometry.':
    'O texto foi encontrado, mas nenhuma ocorrência tem coordenadas confiáveis.',
  'The host returned partial page data.': 'O Zotero retornou dados de página incompletos.',
  'The range does not align with complete PDF glyphs.':
    'O intervalo não coincide com glifos completos do PDF.',
  'Missing PDF glyph in selected range.': 'Falta um glifo do PDF no intervalo selecionado.',
  'Isolated, diagonal, rotated or unmapped text cannot be transferred.':
    'Texto isolado, diagonal, girado ou sem correspondência não pode ser transferido.',
  'The selected text extends beyond the PDF crop box.':
    'O texto selecionado ultrapassa a área de corte do PDF.',
  'The host text order has an unmarked line or column boundary.':
    'A ordem do texto fornecida pelo Zotero tem um limite de linha ou coluna sem marcação.',
  'No usable text geometry.': 'Não há coordenadas de texto utilizáveis.',
  'Selection exceeds the native annotation position limit.':
    'A seleção excede o tamanho máximo de posição de uma anotação do Zotero.',
  'A page next to the page break has no selectable text.':
    'Uma página ao lado da quebra de página não tem texto selecionável.',
  'A line-end hyphen next to the page break makes the text across the break ambiguous.':
    'Um hífen de fim de linha ao lado da quebra de página torna ambíguo o texto dos dois lados da quebra.',
  'The selection does not continue directly from the end of one page to the start of the next: other text, such as a header, footer or page number, lies between its two parts.':
    'A seleção não continua diretamente do fim de uma página para o início da seguinte: há outro texto entre suas duas partes, como um cabeçalho, um rodapé ou um número de página.',
  'Invalid source rectangles.': 'Retângulos de origem inválidos.',
  'Not every source rectangle maps to text.':
    'Nem todos os retângulos de origem correspondem a texto.',
  'Empty source range.': 'O intervalo de origem está vazio.',
  'Discontinuous source annotation.': 'A anotação de origem é descontínua.',
  'Missing source text offsets.': 'Faltam as posições do texto de origem.',
  'Missing normalized text offsets.': 'Faltam as posições do texto normalizado.',
  'Source text and source geometry disagree; the complete selection cannot be verified.':
    'O texto e as coordenadas de origem não coincidem; não é possível verificar a seleção completa.',
  'Documents or annotations changed during analysis. Run analysis again.':
    'Documentos ou anotações mudaram durante a análise. Execute a análise novamente.',
  'A transfer operation is in progress.': 'Há uma transferência em andamento.',
  'An incomplete transfer journal needs inspection. No further copies will be created.':
    'Um registro de transferência incompleto precisa ser examinado. Nenhuma outra cópia será criada.',
  'An interrupted undo needs inspection. No copies will be removed.':
    'Um desfazer interrompido precisa ser examinado. Nenhuma cópia será removida.',
  'This plan is busy, applied or invalid. Recalculate before another transfer.':
    'Este plano está ocupado, já foi aplicado ou é inválido. Execute a análise novamente antes de outra transferência.',
  'Select at least one proposal.': 'Selecione pelo menos uma proposta.',
  'This plan has already been applied.': 'Este plano já foi aplicado.',
  'One source annotation cannot select multiple occurrences.':
    'Uma anotação de origem não pode selecionar várias ocorrências.',
  'Selected proposal has no verified geometry.':
    'A proposta selecionada não tem coordenadas verificadas.',
  'PDF or annotations changed since analysis. Recalculate the plan.':
    'O PDF ou as anotações mudaram depois da análise. Execute a análise novamente.',
  'Documents or annotations changed during application. The operation was rolled back.':
    'Documentos ou anotações mudaram durante a gravação. A operação foi revertida.',
  'Copies were committed, but the final journal update failed. Reopen MarginCarry to recover the journal; do not reapply.':
    'As cópias foram gravadas, mas a última atualização do registro falhou. Reabra o MarginCarry para recuperar o registro e não aplique o plano novamente.',
  'No completed transfer to undo.': 'Não há nenhuma transferência concluída para desfazer.',
  'Choose local PDF attachments of one item in your personal library.':
    'Escolha anexos em PDF locais de um mesmo item da sua biblioteca pessoal.',
  'The PDF is not locally available. Download it first.':
    'O PDF não está disponível localmente. Baixe-o primeiro.',
  'The source and target must be different attachments.':
    'A origem e o destino devem ser anexos diferentes.',
  'Two attachments of the same bibliographic item are required.':
    'São necessários dois anexos do mesmo item bibliográfico.',
  'PDF reader initialization timed out. Open the PDF and retry.':
    'A inicialização do leitor de PDF excedeu o tempo limite. Abra o PDF e tente novamente.',
  'Zotero could not open the PDF reader.': 'O Zotero não conseguiu abrir o leitor de PDF.',
  'This Zotero reader does not expose the verified PDF adapter API.':
    'O leitor desta versão do Zotero não oferece a interface verificada necessária.',
  'The PDF changed while loading. Run analysis again.':
    'O PDF mudou durante o carregamento. Execute a análise novamente.',
  'The loaded PDF changed. Run analysis again before reviewing or applying.':
    'O PDF carregado mudou. Execute a análise novamente antes de revisar ou aplicar.',
  'Page too large for a safe preview. Open its reader position instead.':
    'A página é grande demais para uma pré-visualização segura. Abra essa posição no leitor.',
  'Copies are in Trash, but an open reader could not refresh. Reopen the PDF and MarginCarry to recover the operation journal.':
    'As cópias estão na Lixeira, mas não foi possível atualizar um leitor aberto. Reabra o PDF e o MarginCarry para recuperar o registro de operações.',
  'Generated key already exists.': 'A chave gerada já existe.',
  'Created annotation no longer exists.': 'A anotação criada não existe mais.',
  'Undo requires an active operation transaction.':
    'Desfazer exige uma transação de operação ativa.',
  'Transfer journal has an unsupported format.':
    'O registro de transferências tem um formato não compatível.',
};
