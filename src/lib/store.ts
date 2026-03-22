import { Contract, Case } from "./types";

const STORAGE_KEY = "clause_contracts";
const CASES_KEY = "clause_cases";

export function getContracts(): Contract[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getContract(id: string): Contract | null {
  const contracts = getContracts();
  return contracts.find((c) => c.id === id) || null;
}

export function saveContract(contract: Contract): void {
  const contracts = getContracts();
  const idx = contracts.findIndex((c) => c.id === contract.id);
  if (idx >= 0) {
    contracts[idx] = contract;
  } else {
    contracts.unshift(contract);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

export function deleteContract(id: string): void {
  const contracts = getContracts().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
}

export function getCases(): Case[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CASES_KEY);
  if (data) return JSON.parse(data);

  // Auto-generate cases by grouping contracts by contractType
  const contracts = getContracts();
  const groups: Record<string, string[]> = {};
  for (const c of contracts) {
    const key = c.contractType || "Uncategorized";
    if (!groups[key]) groups[key] = [];
    groups[key].push(c.id);
  }
  const cases: Case[] = Object.entries(groups).map(([name, contractIds]) => ({
    id: crypto.randomUUID(),
    name,
    contractIds,
  }));
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
  return cases;
}

export function saveCases(cases: Case[]): void {
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
}
