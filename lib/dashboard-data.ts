import { format, subDays } from "date-fns";
import {
  aggregateCoreMetrics,
  aggregateInventoryTiers,
  buildPacingHeader,
  getLookupMap,
  getPeopleMap,
  getSalesFactsByMonth,
  getSalesFactsByYear,
  withPacingValue,
} from "@/lib/analytics";
import { pool } from "@/lib/db";
import { safeDivide } from "@/lib/format";

export async function getOverallSalesData(year: number) {
  const facts = await getSalesFactsByYear(year);
  const people = await getPeopleMap();

  const rows = people.map((person) => {
    const scoped = facts.filter((row) => row.sales_person_id === person.id);
    const metrics = aggregateCoreMetrics(scoped);
    return {
      salesAssociate: person.name,
      grossProfit: metrics.gp,
      units: metrics.units,
      revenue: metrics.revenue,
      gppu: metrics.gppu,
      aging: metrics.averageAging,
      margin: metrics.margin,
      avePrice: metrics.averagePrice,
    };
  });

  const totals = {
    grossProfit: rows.reduce((sum, row) => sum + row.grossProfit, 0),
    units: rows.reduce((sum, row) => sum + row.units, 0),
    revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
  };

  const average = {
    grossProfit: rows.length ? totals.grossProfit / rows.length : 0,
    units: rows.length ? totals.units / rows.length : 0,
    revenue: rows.length ? totals.revenue / rows.length : 0,
  };

  return {
    rows,
    totals: {
      ...totals,
      gppu: safeDivide(totals.grossProfit, totals.units),
      margin: safeDivide(totals.grossProfit, totals.revenue),
      avePrice: safeDivide(totals.revenue, totals.units),
    },
    average: {
      ...average,
      gppu: rows.map((row) => row.gppu).filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
        Math.max(1, rows.map((row) => row.gppu).filter((v) => v != null).length),
      margin: rows.map((row) => row.margin).filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
        Math.max(1, rows.map((row) => row.margin).filter((v) => v != null).length),
      avePrice: rows.map((row) => row.avePrice).filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
        Math.max(1, rows.map((row) => row.avePrice).filter((v) => v != null).length),
      aging: rows.map((row) => row.aging).filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
        Math.max(1, rows.map((row) => row.aging).filter((v) => v != null).length),
    },
  };
}

export async function getInPersonRemoteData(month: number, year: number) {
  const facts = await getSalesFactsByMonth(month, year);
  const map = await getLookupMap("in_person_options");

  const categories = ["In Person", "Remote"].map((label) => {
    const scoped = facts.filter((row) => map.get(row.in_person_option_id ?? "")?.toLowerCase() === label.toLowerCase());
    const gp = scoped.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);
    const count = scoped.length;
    return { category: label.toUpperCase(), gp, count };
  });

  const totalGp = categories.reduce((sum, row) => sum + row.gp, 0);
  const totalCount = categories.reduce((sum, row) => sum + row.count, 0);

  return {
    rows: categories.map((row) => ({
      ...row,
      dealsShare: safeDivide(row.count, totalCount),
      gpShare: safeDivide(row.gp, totalGp),
      gppu: safeDivide(row.gp, row.count),
    })),
    totals: { totalGp, totalCount },
  };
}

export async function getLeadPerformanceMonthlyData(month: number, year: number) {
  const [facts, leadMap, header] = await Promise.all([
    getSalesFactsByMonth(month, year),
    getLookupMap("lead_sources"),
    Promise.resolve(buildPacingHeader(month, year)),
  ]);

  const budgetResult = await pool.query<{
    lead_source_id: string;
    gp_budget: string | null;
    unit_budget: string | null;
  }>(
    `SELECT lead_source_id, gp_budget, unit_budget
     FROM budgets
     WHERE year = $1 AND month = $2 AND lead_source_id IS NOT NULL`,
    [year, month],
  );

  const budgetMap = new Map(
    budgetResult.rows.map((row) => [
      row.lead_source_id,
      { gp_budget: Number(row.gp_budget ?? 0), unit_budget: Number(row.unit_budget ?? 0) },
    ]),
  );

  const rows = Array.from(leadMap.entries()).map(([id, name]) => {
    const scoped = facts.filter((row) => row.lead_source_id === id);
    const metrics = aggregateCoreMetrics(scoped);
    const gpBudget = budgetMap.get(id)?.gp_budget ?? 0;
    const unitBudget = budgetMap.get(id)?.unit_budget ?? 0;
    const pacingGp = withPacingValue(metrics.gp, header);
    const pacingUnits = withPacingValue(metrics.units, header);
    const pacingRevenue = withPacingValue(metrics.revenue, header);

    return {
      leadSource: name,
      gp: metrics.gp,
      gpBudget,
      pacingGp,
      overUnderGp: pacingGp == null ? null : pacingGp - gpBudget,
      units: metrics.units,
      unitBudget,
      pacingUnits,
      overUnderUnits: pacingUnits == null ? null : pacingUnits - unitBudget,
      revenue: metrics.revenue,
      pacingRevenue,
      gppu: metrics.gppu,
      aging: metrics.averageAging,
      margin: metrics.margin,
      avePrice: metrics.averagePrice,
    };
  });

  const totals = {
    gp: rows.reduce((sum, r) => sum + r.gp, 0),
    gpBudget: rows.reduce((sum, r) => sum + r.gpBudget, 0),
    pacingGp: rows.reduce((sum, r) => sum + (r.pacingGp ?? 0), 0),
    overUnderGp: rows.reduce((sum, r) => sum + (r.overUnderGp ?? 0), 0),
    units: rows.reduce((sum, r) => sum + r.units, 0),
    unitBudget: rows.reduce((sum, r) => sum + r.unitBudget, 0),
    pacingUnits: rows.reduce((sum, r) => sum + (r.pacingUnits ?? 0), 0),
    overUnderUnits: rows.reduce((sum, r) => sum + (r.overUnderUnits ?? 0), 0),
    revenue: rows.reduce((sum, r) => sum + r.revenue, 0),
    pacingRevenue: rows.reduce((sum, r) => sum + (r.pacingRevenue ?? 0), 0),
  };

  const count = rows.length || 1;
  const leadAverage = {
    gp: totals.gp / count,
    gpBudget: totals.gpBudget / count,
    pacingGp: totals.pacingGp / count,
    overUnderGp: totals.overUnderGp / count,
    units: totals.units / count,
    unitBudget: totals.unitBudget / count,
    pacingUnits: totals.pacingUnits / count,
    overUnderUnits: totals.overUnderUnits / count,
    revenue: totals.revenue / count,
    pacingRevenue: totals.pacingRevenue / count,
    gppu: rows.map((r) => r.gppu).filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
      Math.max(1, rows.map((r) => r.gppu).filter((v) => v != null).length),
    aging: rows.map((r) => r.aging).filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
      Math.max(1, rows.map((r) => r.aging).filter((v) => v != null).length),
    margin: rows.map((r) => r.margin).filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
      Math.max(1, rows.map((r) => r.margin).filter((v) => v != null).length),
    avePrice: rows.map((r) => r.avePrice).filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
      Math.max(1, rows.map((r) => r.avePrice).filter((v) => v != null).length),
  };

  return {
    header,
    rows,
    totals: {
      ...totals,
      gppu: safeDivide(totals.gp, totals.units),
      aging: null as number | null,
      margin: safeDivide(totals.gp, totals.revenue),
      avePrice: safeDivide(totals.revenue, totals.units),
    },
    average: leadAverage,
  };
}

export async function getInventoryTiersData(totalDays = 90) {
  const endDate = new Date();
  const startDate = subDays(endDate, totalDays);

  const { rows } = await pool.query<{ sold_for: string; profit: string; age_days: number | null }>(
    `SELECT sold_for, profit, age_days
     FROM sales
     WHERE date_out >= $1 AND date_out <= $2
       AND is_cashed = true`,
    [format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
  );

  const salesRows = rows.map((row) => ({
    sold_for: Number(row.sold_for ?? 0),
    profit: Number(row.profit ?? 0),
    age_days: row.age_days,
  }));

  const tierRows = aggregateInventoryTiers(salesRows);

  return {
    startDate: format(startDate, "yyyy-MM-dd"),
    endDate: format(endDate, "yyyy-MM-dd"),
    totalDays,
    rows: tierRows.map((row) => ({
      ...row,
      perDay: row.count / totalDays,
      gpPerDay: row.gp / totalDays,
    })),
  };
}

export async function getBrandPerformanceData(year: number) {
  const [facts, brandMap, conditionMap] = await Promise.all([
    getSalesFactsByYear(year),
    getLookupMap("brands"),
    getLookupMap("condition_types"),
  ]);

  const totalUnits = facts.length;
  const totalGp = facts.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);

  const rows: {
    brand: string;
    condition: string;
    unitsShare: number | null;
    gpShare: number | null;
    revenue: number;
    gp: number;
    units: number;
    margin: number | null;
    markup: number | null;
    aging: number | null;
  }[] = [];

  brandMap.forEach((brandName, brandId) => {
    conditionMap.forEach((conditionName, conditionId) => {
      const scoped = facts.filter(
        (row) => row.brand_id === brandId && row.condition_type_id === conditionId,
      );
      if (scoped.length === 0) return;
      const metrics = aggregateCoreMetrics(scoped);
      rows.push({
        brand: brandName,
        condition: conditionName,
        unitsShare: safeDivide(metrics.units, totalUnits),
        gpShare: safeDivide(metrics.gp, totalGp),
        revenue: metrics.revenue,
        gp: metrics.gp,
        units: metrics.units,
        margin: metrics.margin,
        markup: safeDivide(metrics.gp, metrics.revenue - metrics.gp),
        aging: metrics.averageAging,
      });
    });
  });

  return { rows };
}

export async function getBrandPerformanceM2MData(month: number, year: number) {
  const [facts, brandMap, conditionMap] = await Promise.all([
    getSalesFactsByMonth(month, year),
    getLookupMap("brands"),
    getLookupMap("condition_types"),
  ]);

  const totalUnits = facts.length;
  const totalGp = facts.reduce((sum, row) => sum + Number(row.profit ?? 0), 0);

  const rows: {
    brand: string;
    condition: string;
    gpShare: number | null;
    unitsShare: number | null;
    revenue: number;
    gp: number;
    count: number;
    margin: number | null;
    markup: number | null;
    aging: number | null;
  }[] = [];

  brandMap.forEach((brandName, brandId) => {
    conditionMap.forEach((conditionName, conditionId) => {
      const scoped = facts.filter(
        (row) => row.brand_id === brandId && row.condition_type_id === conditionId,
      );
      if (scoped.length === 0) return;
      const metrics = aggregateCoreMetrics(scoped);
      rows.push({
        brand: brandName,
        condition: conditionName,
        gpShare: safeDivide(metrics.gp, totalGp),
        unitsShare: safeDivide(metrics.units, totalUnits),
        revenue: metrics.revenue,
        gp: metrics.gp,
        count: metrics.units,
        margin: metrics.margin,
        markup: safeDivide(metrics.gp, metrics.revenue - metrics.gp),
        aging: metrics.averageAging,
      });
    });
  });

  return rows;
}

export async function getInventoryMixData(month: number, year: number) {
  const [facts, header] = await Promise.all([
    getSalesFactsByMonth(month, year),
    Promise.resolve(buildPacingHeader(month, year)),
  ]);

  const conditionMap = await getLookupMap("condition_types");
  const totals = aggregateCoreMetrics(facts);

  // Fetch condition-type budgets
  const budgetResult = await pool.query<{
    condition_type_id: string;
    gp_budget: string | null;
    unit_budget: string | null;
  }>(
    `SELECT condition_type_id, gp_budget, unit_budget
     FROM budgets
     WHERE year = $1 AND month = $2 AND condition_type_id IS NOT NULL`,
    [year, month],
  );

  const budgetMap = new Map(
    budgetResult.rows.map((row) => [
      row.condition_type_id,
      { gp_budget: Number(row.gp_budget ?? 0), unit_budget: Number(row.unit_budget ?? 0) },
    ]),
  );

  const rows = Array.from(conditionMap.entries()).map(([id, name]) => {
    const scoped = facts.filter((row) => row.condition_type_id === id);
    const metrics = aggregateCoreMetrics(scoped);
    const budget = budgetMap.get(id);
    const gpBudget = budget?.gp_budget ?? 0;
    const unitBudget = budget?.unit_budget ?? 0;
    const pacingGp = withPacingValue(metrics.gp, header);
    const pacingUnits = withPacingValue(metrics.units, header);

    return {
      inventoryType: name,
      gp: metrics.gp,
      gpShare: safeDivide(metrics.gp, totals.gp),
      gpBudget,
      pacingGp,
      overUnderGp: pacingGp == null ? null : pacingGp - gpBudget,
      units: metrics.units,
      unitBudget,
      pacingUnits,
      overUnderUnits: pacingUnits == null ? null : pacingUnits - unitBudget,
      revenue: metrics.revenue,
      pacingRevenue: withPacingValue(metrics.revenue, header),
      gppu: metrics.gppu,
      aging: metrics.averageAging,
      margin: metrics.margin,
      avePrice: metrics.averagePrice,
    };
  });

  return { header, rows };
}

export async function getInventoryMixPerSalespersonData(month: number, year: number) {
  const [facts, people, conditionMap, header] = await Promise.all([
    getSalesFactsByMonth(month, year),
    getPeopleMap(),
    getLookupMap("condition_types"),
    Promise.resolve(buildPacingHeader(month, year)),
  ]);

  const rows: Array<{
    salesPerson: string;
    inventoryType: string;
    gp: number;
    gpShare: number | null;
    pacingGp: number | null;
    units: number;
    pacingUnits: number | null;
    revenue: number;
    pacingRevenue: number | null;
    gppu: number | null;
    aging: number | null;
    margin: number | null;
    avePrice: number | null;
  }> = [];

  people.forEach((person) => {
    const personRows = facts.filter((row) => row.sales_person_id === person.id);
    const personTotals = aggregateCoreMetrics(personRows);

    conditionMap.forEach((name, id) => {
      const scoped = personRows.filter((row) => row.condition_type_id === id);
      const metrics = aggregateCoreMetrics(scoped);
      rows.push({
        salesPerson: person.name,
        inventoryType: name,
        gp: metrics.gp,
        gpShare: safeDivide(metrics.gp, personTotals.gp),
        pacingGp: withPacingValue(metrics.gp, header),
        units: metrics.units,
        pacingUnits: withPacingValue(metrics.units, header),
        revenue: metrics.revenue,
        pacingRevenue: withPacingValue(metrics.revenue, header),
        gppu: metrics.gppu,
        aging: metrics.averageAging,
        margin: metrics.margin,
        avePrice: metrics.averagePrice,
      });
    });
  });

  return { header, rows };
}

export async function getLeadPerformanceAnnualData(year: number) {
  const [facts, leadMap] = await Promise.all([getSalesFactsByYear(year), getLookupMap("lead_sources")]);
  const totalCount = facts.length;

  return Array.from(leadMap.entries()).map(([id, name]) => {
    const scoped = facts.filter((row) => row.lead_source_id === id);
    const metrics = aggregateCoreMetrics(scoped);
    return {
      source: name,
      salesShare: safeDivide(metrics.units, totalCount),
      revenue: metrics.revenue,
      gp: metrics.gp,
      count: metrics.units,
      margin: metrics.margin,
      aging: metrics.averageAging,
    };
  });
}

export async function getLeadPerformanceM2MData(month: number, year: number) {
  const [facts, leadMap] = await Promise.all([getSalesFactsByMonth(month, year), getLookupMap("lead_sources")]);
  const totalCount = facts.length;

  return Array.from(leadMap.entries()).map(([id, name]) => {
    const scoped = facts.filter((row) => row.lead_source_id === id);
    const metrics = aggregateCoreMetrics(scoped);
    return {
      source: name,
      salesShare: safeDivide(metrics.units, totalCount),
      revenue: metrics.revenue,
      gp: metrics.gp,
      count: metrics.units,
      margin: metrics.margin,
      aging: metrics.averageAging,
    };
  });
}
