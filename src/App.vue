<script setup lang="ts">
import { useDerivationGraph } from "./composables/useDerivationGraph";
import DerivationGraphView from "./components/DerivationGraphView.vue";

const { data, error } = useDerivationGraph();
</script>

<template>
    <div v-if="error" class="text-red-600 mb-2">
      {{ error }}
    </div>

    <DerivationGraphView v-if="data" :graph="data" />
</template>