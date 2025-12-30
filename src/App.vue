<script setup lang="ts">
import { useDerivationGraph } from './composables/useDerivationGraph';


const { data, error } = useDerivationGraph()
</script>

<template>
{{ data }}
{{ error }}
</template>