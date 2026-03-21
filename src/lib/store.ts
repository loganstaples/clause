import { Contract } from "./types";

const STORAGE_KEY = "clause_contracts";

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
