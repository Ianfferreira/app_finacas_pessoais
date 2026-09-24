# Resolução de possíveis duplicidades

Detecção de duplicidade nunca elimina uma movimentação. Ela cria um candidato e
duas pendências de revisão. A pessoa usuária pode descartá-lo ou confirmar que
os dois registros representam o mesmo evento.

Ao confirmar, a pessoa escolhe qual transação é a canônica. A outra recebe
`is_void = true`, portanto deixa de compor métricas e fechamentos, mas o
registro bruto, a transação interpretada, o candidato e o vínculo
`duplicate_of` permanecem auditáveis.

Confirmar um candidato não mescla nem reescreve dados de origem. Candidatos
pendentes que envolvem a interpretação marcada como redundante são descartados
para não manter revisão sobre uma linha já excluída dos agregados.
