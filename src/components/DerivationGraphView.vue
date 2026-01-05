<script setup lang="ts">
  import * as d3 from "d3";
  import { onMounted, ref, watch, computed } from "vue";
  import type { DerivationGraph, Node } from "../types/types";
  
  const props = defineProps<{ graph: DerivationGraph }>();
  
  const svgRef = ref<SVGSVGElement | null>(null);
  const selectedNodeId = ref<number | null>(null);
  const searchQuery = ref("");
  
  let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown>;
  let zoomLayer: d3.Selection<SVGGElement, unknown, null, undefined>;
  let nodePositions = new Map<number, { x: number; y: number }>();
  
  /* ---------- Derived data ---------- */
  const selectedNode = computed(() =>
    props.graph.nodes.find(n => n.id === selectedNodeId.value) ?? null
  );
  
  const parentNode = computed(() => {
    if (!selectedNode.value) return null;
    const link = props.graph.links.find(l => l.target === selectedNode.value.id);
    return link
      ? props.graph.nodes.find(n => n.id === link.source) ?? null
      : null;
  });
  
  const childNodes = computed(() => {
    if (!selectedNode.value) return [];
    return props.graph.links
      .filter(l => l.source === selectedNode.value.id)
      .map(l => props.graph.nodes.find(n => n.id === l.target))
      .filter(Boolean) as Node[];
  });
  
  const siblingNodes = computed(() => {
    if (!parentNode.value || !selectedNode.value) return [];
    return props.graph.links
      .filter(
        l =>
          l.source === parentNode.value.id &&
          l.target !== selectedNode.value.id
      )
      .map(l => props.graph.nodes.find(n => n.id === l.target))
      .filter(Boolean) as Node[];
  });
  
  /* ---------- Search ---------- */
  const searchResults = computed(() => {
    if (!searchQuery.value) return [];
    const q = Number(searchQuery.value);
    if (Number.isNaN(q)) return [];
    return props.graph.nodes.filter(n => n.id === q);
  });
  
  /* ---------- Graph rendering ---------- */
  function renderGraph(graph: DerivationGraph) {
    if (!svgRef.value) return;
  
    const width = window.innerWidth;
    const height = window.innerHeight;
  
    d3.select(svgRef.value).selectAll("*").remove();
  
    const svg = d3
      .select(svgRef.value)
      .attr("viewBox", `0 0 ${width} ${height}`);
  
    zoomLayer = svg.append("g");
  
    zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        zoomLayer.attr("transform", event.transform);
      });
  
    svg.call(zoomBehavior);
  
    /* ---------- Hierarchy ---------- */
    const rootNode = d3.stratify<Node>()
      .id(d => d.id.toString())
      .parentId(d => {
        const parent = graph.links.find(l => l.target === d.id);
        return parent ? parent.source.toString() : null;
      })(graph.nodes);
  
    const treeLayout = d3.tree<Node>().nodeSize([180, 110]);
    const hierarchyRoot = treeLayout(rootNode);
  
    /* ---------- Store positions ---------- */
    nodePositions.clear();
    hierarchyRoot.descendants().forEach(d => {
      nodePositions.set(d.data.id, { x: d.x, y: d.y });
    });
  
    /* ---------- Links ---------- */
    zoomLayer.append("g")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(hierarchyRoot.links())
      .enter()
      .append("line")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
  
    /* ---------- Nodes ---------- */
    const nodes = zoomLayer.append("g")
      .selectAll("g")
      .data(hierarchyRoot.descendants())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
      .style("cursor", "pointer")
      .on("click", (_, d) => selectNode(d.data.id));
  
    nodes.append("rect")
      .attr("x", -80)
      .attr("y", -20)
      .attr("width", 160)
      .attr("height", 40)
      .attr("rx", 6)
      .attr("fill", d =>
        d.data.id === selectedNodeId.value ? "#e0f2fe" : "#f8fafc"
      )
      .attr("stroke", "#94a3b8");
  
    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 11)
      .attr("fill", "#0f172a")
      .text(d => `#${d.data.id}: ${d.data.rule}`);
  }
  
  /* ---------- Selection + focus ---------- */
  function selectNode(id: number) {
    selectedNodeId.value = id;
    focusNode(id);
    renderGraph(props.graph);
  }
  
  function focusNode(id: number) {
    if (!svgRef.value) return;
    const pos = nodePositions.get(id);
    if (!pos) return;
  
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = 1.2;
  
    const tx = width / 2 - pos.x * scale;
    const ty = height / 2 - pos.y * scale;
  
    d3.select(svgRef.value)
      .transition()
      .duration(500)
      .call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
  }
  
  onMounted(() => renderGraph(props.graph));
  watch(() => props.graph, renderGraph, { deep: true });
  </script>
  
  <template>
    <div class="flex w-screen h-screen overflow-hidden">
      <!-- Graph -->
      <svg
        ref="svgRef"
        class="flex-1 h-full bg-white"
      />
  
      <!-- Sidebar -->
      <aside class="w-96 h-full border-l bg-slate-50 p-4 overflow-y-auto text-sm">
          <div v-if="selectedNodeId !== null" class="flex text-blue-600 justify-between mb-3">
            <button :disabled="selectedNodeId === 0" class="cursor-pointer hover:underline disabled:text-slate-400 disabled:hover:no-underline disabled:cursor-not-allowed" @click="selectNode(selectedNodeId - 1)">← Previous node</button>
            <button :disabled="selectedNodeId === props.graph.nodes.length - 1" class="cursor-pointer hover:underline disabled:text-slate-400 disabled:hover:no-underline disabled:cursor-not-allowed" @click="selectNode(selectedNodeId + 1)">Next node →</button>
          </div>
        <!-- Search -->
        <div class="mb-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search node ID…"
            class="w-full px-3 py-2 border rounded"
          />
          <ul v-if="searchResults.length" class="mt-2">
            <li
              v-for="n in searchResults"
              :key="n.id"
              class="cursor-pointer text-blue-600 hover:underline"
              @click="selectNode(n.id)"
            >
              #{{ n.id }} — {{ n.rule }}
            </li>
          </ul>
        </div>
  
        <div v-if="selectedNode">
          <h2 class="font-semibold mb-2">
            Node #{{ selectedNode.id }}
          </h2>
  
          <p class="mb-2">
            <strong>Rule:</strong><br />
            {{ selectedNode.rule }}
          </p>
  
          <p class="mb-2">
            <strong>Inputs:</strong>
            <span v-if="selectedNode.inputs.length">
              {{ selectedNode.inputs.join(", ") }}
            </span>
            <span v-else class="text-slate-400">none</span>
          </p>
  
          <p class="mb-2">
            <strong>Outputs:</strong>
            <span v-if="selectedNode.outputs.length">
              {{ selectedNode.outputs.join(", ") }}
            </span>
            <span v-else class="text-slate-400">none</span>
          </p>
  
          <div v-if="parentNode" class="mb-3">
            <button
              class="text-blue-600 hover:underline"
              @click="selectNode(parentNode.id)"
            >
              ↑ Go to parent
            </button>
          </div>
  
          <div class="mb-3">
            <strong>Siblings:</strong>
            <ul class="list-disc ml-5 mt-1">
              <li
                v-for="sib in siblingNodes"
                :key="sib.id"
                class="cursor-pointer text-blue-600 hover:underline"
                @click="selectNode(sib.id)"
              >
                #{{ sib.id }} — {{ sib.rule }}
              </li>
            </ul>
            <p v-if="!siblingNodes.length" class="text-slate-400">
              No siblings
            </p>
          </div>
  
          <div>
            <strong>Children:</strong>
            <ul class="list-disc ml-5 mt-1">
              <li
                v-for="child in childNodes"
                :key="child.id"
                class="cursor-pointer text-blue-600 hover:underline"
                @click="selectNode(child.id)"
              >
                #{{ child.id }} — {{ child.rule }}
              </li>
            </ul>
            <p v-if="!childNodes.length" class="text-slate-400">
              No children
            </p>
          </div>
        </div>
  
        <p v-else class="text-slate-400">
          Search or click a node to see details
        </p>
      </aside>
    </div>
  </template>
  