import { describe, it, expect } from 'vitest';
import { calculateMRR, formatCurrency } from '../billing';

describe('Billing Utils', () => {
    describe('calculateMRR', () => {
        it('should calculate monthly cost for monthly recurrence', () => {
            expect(calculateMRR(100, 'monthly')).toBe(100);
        });

        it('should calculate monthly cost for quarterly recurrence', () => {
            expect(calculateMRR(300, 'quarterly')).toBe(100);
        });

        it('should calculate monthly cost for semiannual recurrence', () => {
            expect(calculateMRR(600, 'semiannual')).toBe(100);
        });

        it('should calculate monthly cost for annual recurrence', () => {
            expect(calculateMRR(1200, 'annual')).toBe(100);
        });

        it('should return 0 for one_time recurrence', () => {
            expect(calculateMRR(1000, 'one_time')).toBe(0);
        });

        it('should return 0 for zero or negative amount', () => {
            expect(calculateMRR(0, 'monthly')).toBe(0);
            expect(calculateMRR(-50, 'monthly')).toBe(0);
        });
    });

    describe('formatCurrency', () => {
        it('should format numbers to BRL currency string', () => {
            const result = formatCurrency(1250.5);
            // Using regex to match result because of potential non-breaking space issues in different environments
            expect(result).toMatch(/R\$\s?1\.250,50/);
        });
    });
});
