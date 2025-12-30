import { z } from "zod";

/** A directed edge between nodes */
export const LinkSchema = z.object({
  source: z.number(),
  target: z.number(),
});

/** A single node in the derivation graph */
export const NodeSchema = z.object({
  id: z.number(),
  rule: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  children: z.array(z.number()),
});

/** Root object */
export const DerivationGraphSchema = z.object({
  nodes: z.array(NodeSchema),
  links: z.array(LinkSchema),
});

export type Link = z.infer<typeof LinkSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type DerivationGraph = z.infer<typeof DerivationGraphSchema>;
