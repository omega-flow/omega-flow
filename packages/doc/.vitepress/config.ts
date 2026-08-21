import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Omega Flow',
  description: 'Documentation for Omega Flow workflow engine and editor',
  base: '/omega-flow/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/engine' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Core Concepts', link: '/guide/core-concepts' }
          ]
        },
        {
          text: 'Workflow Engine',
          items: [
            { text: 'Executing Workflows', link: '/guide/engine-execution' },
            { text: 'Dynamic Values', link: '/guide/dynamic-values' },
            { text: 'Event Subscriptions', link: '/guide/event-subscriptions' },
            { text: 'Custom Nodes (Engine)', link: '/guide/engine-custom-nodes' }
          ]
        },
        {
          text: 'Adapters',
          items: [
            { text: 'AWS', link: '/guide/store-aws' }
          ]
        },
        {
          text: 'Workflow Editor',
          items: [
            { text: 'Editor Setup', link: '/guide/editor-setup' },
            { text: 'Theming', link: '/guide/theming' },
            { text: 'Localization', link: '/guide/localization' },
            { text: 'Custom Nodes (Editor)', link: '/guide/custom-nodes' }
          ]
        }
      ],
      '/api/': [
        {
          text: 'Engine',
          items: [
            { text: 'Engine API', link: '/api/engine' },
            { text: 'WorkflowManager', link: '/api/engine#workflowmanager' },
            { text: 'WorkflowModel', link: '/api/engine#workflowmodel' },
            { text: 'NodeModel', link: '/api/engine#nodemodel' },
            { text: 'Storage Interfaces', link: '/api/engine#storage-interfaces' },
            { text: 'Built-in Nodes', link: '/api/engine#built-in-node-types' }
          ]
        },
        {
          text: 'Editor Components',
          items: [
            { text: 'WorkflowEditor', link: '/api/components' },
            { text: 'NodesPanel', link: '/api/components#nodespanel' },
            { text: 'DetailPanel', link: '/api/components#detailpanel' },
            { text: 'OptionsPanel', link: '/api/components#optionspanel' },
            { text: 'ControlPanel', link: '/api/components#controlpanel' }
          ]
        },
        {
          text: 'Editor Hooks',
          items: [
            { text: 'useWorkflowEditor', link: '/api/hooks' },
            { text: 'useNodes', link: '/api/hooks#usenodes' },
            { text: 'useEdges', link: '/api/hooks#useedges' },
            { text: 'useNodeRegistry', link: '/api/hooks#usenoderegistry' },
            { text: 'useDragAndDrop', link: '/api/hooks#usedraganddrop' },
            { text: 'useSelectedNode', link: '/api/hooks#useselectednode' }
          ]
        },
        {
          text: 'Editor Primitives',
          items: [
            { text: 'Form Fields', link: '/api/primitives' }
          ]
        },
        {
          text: 'Types',
          items: [
            { text: 'Type Reference', link: '/api/types' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/omega-flow/omega-flow' }
    ],
    outline: {
      level: [2, 3]
    }
  }
})
