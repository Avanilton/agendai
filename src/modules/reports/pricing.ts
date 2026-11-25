export interface PricingInput {
  materialCostReais: number;
  durationMinutes: number;
  hourlyLaborCostReais: number;
  monthlyFixedCostsReais: number;
  monthlyBillableHours: number;
  variableCostReais: number;
  taxPercent: number;
  commissionPercent: number;
  paymentFeePercent: number;
  desiredMarginPercent: number;
}

export interface PricingOutput {
  directCostReais: number;
  fixedCostAllocationReais: number;
  totalCostReais: number;
  totalDeductionPercent: number;
  minimumPriceReais: number;
  recommendedPriceReais: number;
  estimatedProfitReais: number;
  realMarginPercent: number;
  isFeasible: boolean;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calculates break-even (minimum) and recommended service price accounting for
 * materials, labor time, fixed overhead allocation, variable costs, taxes,
 * commissions, payment fees, and target net margin.
 */
export function calculateServicePricing(input: PricingInput): PricingOutput {
  const hours = Math.max(0, input.durationMinutes) / 60;
  const laborCost = hours * Math.max(0, input.hourlyLaborCostReais);
  const fixedCostPerHour =
    input.monthlyBillableHours > 0
      ? Math.max(0, input.monthlyFixedCostsReais) / input.monthlyBillableHours
      : 0;
  const fixedCostAllocation = hours * fixedCostPerHour;
  const directCost =
    Math.max(0, input.materialCostReais) +
    laborCost +
    Math.max(0, input.variableCostReais);
  const totalCost = directCost + fixedCostAllocation;

  const totalDeductionPct =
    Math.max(0, input.taxPercent) +
    Math.max(0, input.commissionPercent) +
    Math.max(0, input.paymentFeePercent);

  const marginPct = Math.max(0, input.desiredMarginPercent);

  const minDivisor = 1 - totalDeductionPct / 100;
  const recDivisor = 1 - (totalDeductionPct + marginPct) / 100;

  if (minDivisor <= 0.01 || recDivisor <= 0.01) {
    return {
      directCostReais: round2(directCost),
      fixedCostAllocationReais: round2(fixedCostAllocation),
      totalCostReais: round2(totalCost),
      totalDeductionPercent: round2(totalDeductionPct),
      minimumPriceReais: 0,
      recommendedPriceReais: 0,
      estimatedProfitReais: 0,
      realMarginPercent: 0,
      isFeasible: false,
    };
  }

  const minimumPrice = totalCost / minDivisor;
  const recommendedPrice = totalCost / recDivisor;
  const deductionsAtRecommended = recommendedPrice * (totalDeductionPct / 100);
  const estimatedProfit = recommendedPrice - totalCost - deductionsAtRecommended;
  const realMarginPercent =
    recommendedPrice > 0 ? (estimatedProfit / recommendedPrice) * 100 : 0;

  return {
    directCostReais: round2(directCost),
    fixedCostAllocationReais: round2(fixedCostAllocation),
    totalCostReais: round2(totalCost),
    totalDeductionPercent: round2(totalDeductionPct),
    minimumPriceReais: round2(minimumPrice),
    recommendedPriceReais: round2(recommendedPrice),
    estimatedProfitReais: round2(estimatedProfit),
    realMarginPercent: round2(realMarginPercent),
    isFeasible: true,
  };
}

export interface ProductPricingInput {
  purchaseCostReais: number;
  freightAndPackagingReais: number;
  variableCostReais: number;
  fixedCostPerUnitReais: number;
  taxPercent: number;
  commissionPercent: number;
  paymentFeePercent: number;
  desiredMarginPercent: number;
}

/**
 * Calculates break-even (minimum) and recommended product sale price accounting for
 * acquisition cost, freight/packaging, variable costs, fixed cost per unit, taxes,
 * commissions, payment fees, and target net margin.
 */
export function calculateProductPricing(
  input: ProductPricingInput
): PricingOutput {
  const directCost =
    Math.max(0, input.purchaseCostReais) +
    Math.max(0, input.freightAndPackagingReais) +
    Math.max(0, input.variableCostReais);
  const fixedCostAllocation = Math.max(0, input.fixedCostPerUnitReais);
  const totalCost = directCost + fixedCostAllocation;

  const totalDeductionPct =
    Math.max(0, input.taxPercent) +
    Math.max(0, input.commissionPercent) +
    Math.max(0, input.paymentFeePercent);

  const marginPct = Math.max(0, input.desiredMarginPercent);

  const minDivisor = 1 - totalDeductionPct / 100;
  const recDivisor = 1 - (totalDeductionPct + marginPct) / 100;

  if (minDivisor <= 0.01 || recDivisor <= 0.01) {
    return {
      directCostReais: round2(directCost),
      fixedCostAllocationReais: round2(fixedCostAllocation),
      totalCostReais: round2(totalCost),
      totalDeductionPercent: round2(totalDeductionPct),
      minimumPriceReais: 0,
      recommendedPriceReais: 0,
      estimatedProfitReais: 0,
      realMarginPercent: 0,
      isFeasible: false,
    };
  }

  const minimumPrice = totalCost / minDivisor;
  const recommendedPrice = totalCost / recDivisor;
  const deductionsAtRecommended = recommendedPrice * (totalDeductionPct / 100);
  const estimatedProfit = recommendedPrice - totalCost - deductionsAtRecommended;
  const realMarginPercent =
    recommendedPrice > 0 ? (estimatedProfit / recommendedPrice) * 100 : 0;

  return {
    directCostReais: round2(directCost),
    fixedCostAllocationReais: round2(fixedCostAllocation),
    totalCostReais: round2(totalCost),
    totalDeductionPercent: round2(totalDeductionPct),
    minimumPriceReais: round2(minimumPrice),
    recommendedPriceReais: round2(recommendedPrice),
    estimatedProfitReais: round2(estimatedProfit),
    realMarginPercent: round2(realMarginPercent),
    isFeasible: true,
  };
}

