export type RecurrenceType = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'one_time';

/**
 * Calcula o valor mensal proporcional de um serviço com base na sua recorrência.
 * @param amount Valor total do serviço
 * @param recurrence Tipo de recorrência
 * @returns Valor mensal (MRR)
 */
export function calculateMRR(amount: number, recurrence: RecurrenceType): number {
    if (amount <= 0) return 0;

    switch (recurrence) {
        case 'monthly':
            return amount;
        case 'quarterly':
            return amount / 3;
        case 'semiannual':
            return amount / 6;
        case 'annual':
            return amount / 12;
        case 'one_time':
        default:
            return 0; // Pagamentos únicos não contam como receita recorrente mensal (MRR)
    }
}

/**
 * Formata um valor numérico para moeda brasileira (BRL).
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(value);
}
