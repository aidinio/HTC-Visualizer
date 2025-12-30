<script setup lang="ts">
  import * as d3 from "d3";
  import { onMounted, ref, watch } from "vue";
  import type { DerivationGraph, Node } from "../types/types";
  
  const props = defineProps<{
    graph: DerivationGraph;
  }>();
  
  const svgRef = ref<SVGSVGElement | null>(null);
  
  function renderGraph(graph: DerivationGraph) {
    if (!svgRef.value) return;
  
    const width = 1200;
    const height = 800;
  
    const svg = d3
      .select(svgRef.value)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .selectAll("*")
      .remove();
  
    const zoomLayer = d3.select(svgRef.value)
      .append("g");
  
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        zoomLayer.attr("transform", event.transform);
      });
  
    d3.select(svgRef.value).call(zoom);
  
    /* ---------- Build hierarchy ---------- */
    const rootNode = d3.stratify<Node>()
      .id(d => d.id)
      .parentId(d => {
        const parent = graph.links.find(l => l.target === d.id);
        return parent ? parent.source : null;
      })(graph.nodes);
  
    const treeLayout = d3.tree<Node>()
      .nodeSize([160, 100]); // horizontal = 160px, vertical = 100px
    const hierarchyRoot = treeLayout(rootNode);
  
    /* ---------- Links ---------- */
    const links = hierarchyRoot.links();
  
    zoomLayer
      .append("g")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);
  
    /* ---------- Nodes ---------- */
    const nodes = zoomLayer
      .append("g")
      .selectAll("g")
      .data(hierarchyRoot.descendants())
      .enter()
      .append("g")
      .attr("transform", d => `translate(${d.x}, ${d.y})`)
      .call(
        d3.drag<SVGGElement, d3.HierarchyPointNode<Node>>()
          .on("start", dragStarted)
          .on("drag", dragged)
          .on("end", dragEnded)
      );
  
    nodes.append("rect")
      .attr("x", -60)
      .attr("y", -18)
      .attr("width", 120)
      .attr("height", 36)
      .attr("rx", 6)
      .attr("fill", "#f8fafc")
      .attr("stroke", "#94a3b8");
  
    nodes.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", 11)
      .attr("fill", "#0f172a")
      .text(d => d.data.rule);
  
    /* ---------- Drag handlers ---------- */
    function dragStarted(event: any, d: any) {
      d.fx = d.x;
      d.fy = d.y;
    }
  
    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
      d3.select(event.sourceEvent.target.parentNode)
        .attr("transform", `translate(${d.fx}, ${d.fy})`);
      
      // Update connected lines
      zoomLayer.selectAll("line")
        .attr("x1", (l: any) => l.source.x)
        .attr("y1", (l: any) => l.source.y)
        .attr("x2", (l: any) => l.target.x)
        .attr("y2", (l: any) => l.target.y);
    }
  
    function dragEnded(event: any, d: any) {
      d.fx = null;
      d.fy = null;
    }
  }
  
  onMounted(() => renderGraph(props.graph));
  watch(() => props.graph, renderGraph, { deep: true });
  </script>
  
  <template>
    <svg ref="svgRef" class="w-full h-[800px] border rounded-lg bg-white" />
  </template>
  