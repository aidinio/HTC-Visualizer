import { ref } from "vue";
import jsonData from "../data/composeDollar-infer.json";
import { type DerivationGraph, DerivationGraphSchema } from "../types/types";

export function useDerivationGraph() {
  const data = ref<DerivationGraph | null>(null);
  const error = ref<string | null>(null);

  try {
    const parsedData = DerivationGraphSchema.parse(jsonData);
    data.value = parsedData;
  } catch (e) {
    if (e instanceof Error) error.value = e.message
    else error.value = 'Unknown error'
  }

  return { data, error };
}
