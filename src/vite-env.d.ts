/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

declare module 'patristic' {
  export class Branch {
    id: string
    length: number
    children: Branch[]
    parent: Branch | null
    constructor(data?: unknown, children?: (d: unknown) => Branch[])
    toNewick(nonterminus?: boolean): string
    toMatrix(): number[][]
    toObject(): unknown
    addChild(data?: unknown): Branch
    fixDistances(): Branch
    fixParenthood(): Branch
    isLeaf(): boolean
  }

  export function parseMatrix(matrix: number[][], labels?: string[]): Branch
  export function parseNewick(newick: string): Branch
  export function parseJSON(json: unknown): Branch
  export const version: string
}

declare module '@phylocanvas/phylocanvas.gl' {
  interface PhylocanvasProps {
    source?: string
    size?: { width: number; height: number }
    padding?: number
    type?: string
    fillColour?: string
    strokeColour?: string
    [key: string]: unknown
  }

  export const TreeTypes: {
    Rectangular: string
    Circular: string
    Radial: string
    Diagonal: string
    Hierarchical: string
  }

  export default class PhylocanvasGL {
    constructor(element: HTMLElement, props?: PhylocanvasProps)
    setProps(props: Partial<PhylocanvasProps>): void
    destroy(): void
  }
}
