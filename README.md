# Context Engineering
Bringing You the Latest Research on Context With First Principles & Visuals — June 2025 from ICML, IBM, NeurIPS, OHBM, and more 

> **"Providing our “cognitive tools” to GPT-4.1 increases its pass@1 performance on AIME2024 from 26.7% to 43.3%, bringing it very close to the performance of o1-preview."** — [**IBM Zurich**](https://www.arxiv.org/pdf/2506.12115)

<div align="center">

### **[IBM Zurich](https://www.arxiv.org/pdf/2506.12115) | [Quantum Semantics](https://arxiv.org/pdf/2506.10077) | [ICML Princeton](https://openreview.net/forum?id=y1SnRPDWx4) | [MEM1 Singapore-MIT](https://arxiv.org/pdf/2506.15841) | [LLM Attractors Shanghai AI](https://arxiv.org/pdf/2502.15208?)**


## [Chat with NotebookLM + Podcast Deep Dive](https://notebooklm.google.com/notebook/0c6e4dc6-9c30-4f53-8e1a-05cc9ff3bc7e)

## [DeepWiki Docs](https://deepwiki.com/davidkimai/Context-Engineering) 


## [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/davidkimai/Context-Engineering) 





</div>

> **"Context engineering is the delicate art and science of filling the context window with just the right information for the next step." — [**Andrej Karpathy**](https://x.com/karpathy/status/1937902205765607626)**

<div align="center">

  
 **[Dynamical Systems Theory Intro](https://content.csbs.utah.edu/~butner/systems/DynamicalSystemsIntro.html) | [Columbia DST](http://wordpress.ei.columbia.edu/ac4/about/our-approach/dynamical-systems-theory/)**


https://github.com/user-attachments/assets/9f046259-e5ec-4160-8ed0-41a608d8adf3



![image](https://github.com/user-attachments/assets/309b8d8c-13b5-403c-9f1d-6a0ad551ea56)

</div>


A practical, first-principles handbook for moving beyond prompt engineering to the wider discipline of context design, orchestration, and optimization.


```
                    Prompt Engineering  │  Context Engineering
                       ↓                │            ↓                      
               "What you say"           │  "Everything else the model sees"
             (Single instruction)       │    (Examples, memory, retrieval,
                                        │     tools, state, control flow)
```




## Why This Repository Exists

> **"Meaning is not an intrinsic, static property of a semantic expression, but rather an emergent phenomenon actualized through the dynamic interaction between the expression and an interpretive agent situated within a specific context."
— [Agostino et al. — June 2025, Indiana University](https://arxiv.org/pdf/2506.10077)**

Prompt engineering gets all the attention, but we can now get excited for what comes next. Once you've mastered prompts, the real power comes from engineering the **entire context window** that surrounds those prompts. Guiding thought, if you will. 

This repository provides a progressive, first-principles approach to context engineering, built around a biological metaphor:

> Cell = Agent 
>
> Organ = Multi-Agent Systems

```
atoms → molecules → cells → organs → neural systems → neural & semantic field theory 
  │        │         │         │             │                         │        
single    few-     memory/    multi-    cognitive tools +     context = fields +
prompt    shot      agents    agents     prompt programs     persistence & resonance
```
> "Abstraction is the cost of generalization"— [**Grant Sanderson (3Blue1Brown)**](https://www.3blue1brown.com/)



```mermaid
graph TD
    classDef basic fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#01579b
    classDef intermediate fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#2e7d32
    classDef advanced fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#e65100
    classDef meta fill:#f3e5f5,stroke:#6a1b9a,stroke-width:2px,color:#6a1b9a
    
    subgraph Basic["Level 1: Basic Context Engineering"]
        A[Atoms]
        B[Molecules]
        C[Cells]
        D[Organs]
    end
    
    subgraph Field["Level 2: Field Theory"]
        E[Neural Systems]
        F[Neural Fields]
    end
    
    subgraph Protocol["Level 3: Protocol System"]
        G[Protocol Shells]
        H[Unified System]
    end
    
    subgraph Meta["Level 4: Meta-Recursion"]
        I[Meta-Recursive Framework]
    end
    
    %% Connections
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    H --> I
    
    %% Descriptions for each level
    A1["Single instructions<br>Simple constraints<br>Basic prompts"] --> A
    B1["Example pairs<br>Few-shot patterns<br>Demonstration sets"] --> B
    C1["Persistent memory<br>State management<br>Context window"] --> C
    D1["Multi-step flows<br>Specialists<br>System orchestration"] --> D
    E1["Reasoning frameworks<br>Verification tools<br>Cognitive patterns"] --> E
    F1["Continuous meaning<br>Attractors & resonance<br>Symbolic residue"] --> F
    G1["Structured templates<br>Field operations<br>Emergence protocols"] --> G
    H1["Protocol integration<br>System-level emergence<br>Self-maintenance"] --> H
    I1["Self-reflection<br>Recursive improvement<br>Interpretable evolution"] --> I
    
    %% Real-world parallels
    A2["Like: Basic prompt<br>engineering"] -.-> A
    B2["Like: Few-shot<br>learning"] -.-> B
    C2["Like: Conversational<br>chatbots"] -.-> C
    D2["Like: Multi-agent<br>systems"] -.-> D
    E2["Like: ReAct<br>Chain-of-Thought"] -.-> E
    F2["Like: Semantic<br>field theory"] -.-> F
    G2["Like: Protocol<br>orchestration"] -.-> G
    H2["Like: Self-organizing<br>systems"] -.-> H
    I2["Like: Self-improving<br>intelligence"] -.-> I
    
    %% Apply classes
    class A,B,C,D,A1,A2,B1,B2,C1,C2,D1,D2 basic
    class E,F,E1,E2,F1,F2 intermediate
    class G,H,G1,G2,H1,H2 advanced
    class I,I1,I2 meta
```

## Project Roadmap & Services

This repo now hosts **Context-Engineering v0.1**—a modular, micro-service platform built on top of the original Velocity PromptEnhancement engine.

* **Architecture Overview:** see `PRDs/Implementation_Roadmap.md`  
* **Detailed PRDs:** one file per Functional Requirement under `PRDs/` (FR-1 … FR-10).  
* **Migration Strategy:** we are **extract-and-evolving** the working monolith in `Velocity/PromptEnhancement` into stand-alone services:
  1. `prompt-engine-svc`  – exposes `/prompt`, `/refine` (FR-1)  
  2. `intent-router-svc`  – intent embedding & model selection (FR-3)  
  3. `executor-svc`       – parallel multi-LLM calls (FR-4)  
  4. `conversation-svc`   – Neural-field session context (FR-5)  
  5. `validator-svc`      – on-demand answer audit (FR-6)  
  6. `prefs-svc`          – learning user preferences (FR-7)

Quick-start (local dev):
```bash
# clone and start Prompt Enhancement service only
cd Velocity/PromptEnhancement
docker compose up --build -d  # http://localhost:8000/health

# run full stack (after extraction)
cd deploy
docker compose up -d  # gateway + all micro-services
```

---

## Under Construction

```python
Context-Engineering/
├── LICENSE                          # MIT license
├── README.md                        # Quick-start overview
├── structure.md                     # Original structural map
├── STRUCTURE_v2.md                  # Enhanced structural map with field theory
├── context.json                     # Original schema configuration
├── context_v2.json                  # Extended schema with field protocols
├── context_v3.json                  # Neural field extensions
├── context_v3.5.json                # Symbolic mechanism integration
├── CITATIONS.md                     # Research references and bridges
│
├── 00_foundations/                  # First-principles theory
│   ├── 01_atoms_prompting.md        # Atomic instruction units
│   ├── 02_molecules_context.md      # Few-shot examples/context
│   ├── 03_cells_memory.md           # Stateful conversation layers
│   ├── 04_organs_applications.md    # Multi-step control flows
│   ├── 05_cognitive_tools.md        # Mental model extensions
│   ├── 06_advanced_applications.md  # Real-world implementations
│   ├── 07_prompt_programming.md     # Code-like reasoning patterns
│   ├── 08_neural_fields_foundations.md # Context as continuous fields
│   ├── 09_persistence_and_resonance.md # Field dynamics and attractors
│   ├── 10_field_orchestration.md    # Coordinating multiple fields
│   ├── 11_emergence_and_attractor_dynamics.md # Emergent properties
│   │── 12_symbolic_mechanisms.md    # Symbolic reasoning in LLMs
│   ├── 13_quantum_semantics.md      # Multiple meanings (Superposition)
│   └── 14_unified_field_theory.md   # Integrating theory models
│
├── 10_guides_zero_to_hero/          # Hands-on tutorials
│   ├── 01_min_prompt.ipynb          # Minimal prompt experiments
│   ├── 02_expand_context.ipynb      # Context expansion techniques
│   ├── 03_control_loops.ipynb       # Flow control mechanisms
│   ├── 04_rag_recipes.ipynb         # Retrieval-augmented patterns
│   ├── 05_protocol_bootstrap.ipynb  # Field protocol bootstrap
│   ├── 06_protocol_token_budget.ipynb # Protocol efficiency
│   ├── 07_streaming_context.ipynb   # Real-time context
│   ├── 08_emergence_detection.ipynb # Detecting emergence
│   ├── 09_residue_tracking.ipynb    # Tracking symbolic residue
│   └── 10_attractor_formation.ipynb # Creating field attractors
│
├── 20_templates/                    # Reusable components
│   ├── minimal_context.yaml         # Base context structure
│   ├── control_loop.py              # Orchestration template
│   ├── scoring_functions.py         # Evaluation metrics
│   ├── prompt_program_template.py   # Program structure template
│   ├── schema_template.yaml         # Schema definition template
│   ├── recursive_framework.py       # Recursive context template
│   ├── field_protocol_shells.py     # Field protocol templates
│   ├── symbolic_residue_tracker.py  # Residue tracking tools
│   ├── context_audit.py             # Context analysis tool
│   ├── shell_runner.py              # Protocol shell runner
│   ├── resonance_measurement.py     # Field resonance metrics
│   ├── attractor_detection.py       # Attractor analysis tools
│   ├── boundary_dynamics.py         # Boundary operation tools
│   └── emergence_metrics.py         # Emergence measurement
│
├── 30_examples/                     # Practical implementations
│   ├── 00_toy_chatbot/              # Simple conversation agent
│   ├── 01_data_annotator/           # Data labeling system
│   ├── 02_multi_agent_orchestrator/ # Agent collaboration system
│   ├── 03_vscode_helper/            # IDE integration 
│   ├── 04_rag_minimal/              # Minimal RAG implementation
│   ├── 05_streaming_window/         # Real-time context demo
│   ├── 06_residue_scanner/          # Symbolic residue demo
│   ├── 07_attractor_visualizer/     # Field visualization
│   ├── 08_field_protocol_demo/      # Protocol demonstration
│   └── 09_emergence_lab/            # Emergence experimentation
│
├── 40_reference/                    # Deep-dive documentation
│   ├── token_budgeting.md           # Token optimization strategies
│   ├── retrieval_indexing.md        # Retrieval system design
│   ├── eval_checklist.md            # PR evaluation criteria
│   ├── cognitive_patterns.md        # Reasoning pattern catalog
│   ├── schema_cookbook.md           # Schema pattern collection
│   ├── patterns.md                  # Context pattern library
│   ├── field_mapping.md             # Field theory fundamentals
│   ├── symbolic_residue_types.md    # Residue classification
│   ├── attractor_dynamics.md        # Attractor theory and practice
│   ├── emergence_signatures.md      # Detecting emergence
│   └── boundary_operations.md       # Boundary management guide
│
├── 50_contrib/                      # Community contributions
│   └── README.md                    # Contribution guidelines
│
├── 60_protocols/                    # Protocol shells and frameworks
│   ├── README.md                    # Protocol overview
│   ├── shells/                      # Protocol shell definitions
│   │   ├── attractor.co.emerge.shell      # Attractor co-emergence
│   │   ├── recursive.emergence.shell      # Recursive field emergence
│   │   ├── recursive.memory.attractor.shell # Memory persistence
│   │   ├── field.resonance.scaffold.shell  # Field resonance
│   │   ├── field.self_repair.shell        # Self-repair mechanisms
│   │   └── context.memory.persistence.attractor.shell # Context persistence
│   ├── digests/                     # Simplified protocol documentation
│   └── schemas/                     # Protocol schemas
│       ├── fractalRepoContext.v3.5.json    # Repository context
│       ├── fractalConsciousnessField.v1.json # Field schema
│       ├── protocolShell.v1.json           # Shell schema
│       ├── symbolicResidue.v1.json         # Residue schema
│       └── attractorDynamics.v1.json       # Attractor schema
│
├── 70_agents/                       # Agent demonstrations
│   ├── README.md                    # Agent overview
│   ├── 01_residue_scanner/          # Symbolic residue detection
│   ├── 02_self_repair_loop/         # Self-repair protocol
│   ├── 03_attractor_modulator/      # Attractor dynamics
│   ├── 04_boundary_adapter/         # Dynamic boundary tuning
│   └── 05_field_resonance_tuner/    # Field resonance optimization
│
├── 80_field_integration/            # Complete field projects
│   ├── README.md                    # Integration overview
│   ├── 00_protocol_ide_helper/      # Protocol development tools
│   ├── 01_context_engineering_assistant/ # Field-based assistant
│   ├── 02_recursive_reasoning_system/    # Recursive reasoning
│   ├── 03_emergent_field_laboratory/     # Field experimentation
│   └── 04_symbolic_reasoning_engine/     # Symbolic mechanisms
│
├── cognitive-tools/                 # Advanced cognitive framework
│   ├── README.md                    # Overview and quick-start guide
│   ├── cognitive-templates/         # Templates for reasoning
│   │   ├── understanding.md         # Comprehension operations
│   │   ├── reasoning.md             # Analytical operations
│   │   ├── verification.md          # Checking and validation
│   │   ├── composition.md           # Combining multiple tools
│   │   └── emergence.md             # Emergent reasoning patterns
│   │
│   ├── cognitive-programs/          # Structured prompt programs
│   │   ├── basic-programs.md        # Fundamental program structures
│   │   ├── advanced-programs.md     # Complex program architectures
│   │   ├── program-library.py       # Python implementations
│   │   ├── program-examples.ipynb   # Interactive examples
│   │   └── emergence-programs.md    # Emergent program patterns
│   │
│   ├── cognitive-schemas/           # Knowledge representations
│   │   ├── user-schemas.md          # User information schemas
│   │   ├── domain-schemas.md        # Domain knowledge schemas
│   │   ├── task-schemas.md          # Reasoning task schemas
│   │   ├── schema-library.yaml      # Reusable schema library
│   │   └── field-schemas.md         # Field representation schemas
│   │
│   ├── cognitive-architectures/     # Complete reasoning systems
│   │   ├── solver-architecture.md   # Problem-solving systems
│   │   ├── tutor-architecture.md    # Educational systems
│   │   ├── research-architecture.md # Information synthesis
│   │   ├── architecture-examples.py # Implementation examples
│   │   └── field-architecture.md    # Field-based architectures
│   │
│   └── integration/                 # Integration patterns
│       ├── with-rag.md              # Integration with retrieval
│       ├── with-memory.md           # Integration with memory
│       ├── with-agents.md           # Integration with agents
│       ├── evaluation-metrics.md    # Effectiveness measurement
│       └── with-fields.md           # Integration with field protocols
│
└── .github/                         # GitHub configuration
    ├── CONTRIBUTING.md              # Contribution guidelines
    ├── workflows/ci.yml             # CI pipeline configuration
    ├── workflows/eval.yml           # Evaluation automation
    └── workflows/protocol_tests.yml # Protocol testing
```

## Quick Start

1. **Read `00_foundations/01_atoms_prompting.md`** (5 min)  
   Understand why prompts alone often underperform

2. **Run `10_guides_zero_to_one/01_min_prompt.py (Jupyter Notebook style)`**  
   Experiment with a minimal working example

3. **Explore `20_templates/minimal_context.yaml`**  
   Copy/paste a template into your own project  

4. **Study `30_examples/00_toy_chatbot/`**  
   See a complete implementation with context management

## Learning Path

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ 00_foundations/ │     │ 10_guides_zero_  │     │ 20_templates/  │
│                 │────▶│ to_one/          │────▶│                │
│ Theory & core   │     │ Hands-on         │     │ Copy-paste     │
│ concepts        │     │ walkthroughs     │     │ snippets       │
└─────────────────┘     └──────────────────┘     └────────────────┘
         │                                                │
         │                                                │
         ▼                                                ▼
┌─────────────────┐                             ┌────────────────┐
│ 40_reference/   │◀───────────────────────────▶│ 30_examples/   │
│                 │                             │                │
│ Deep dives &    │                             │ Real projects, │
│ eval cookbook   │                             │ progressively  │
└─────────────────┘                             │ complex        │
         ▲                                      └────────────────┘
         │                                                ▲
         │                                                │
         └────────────────────┐               ┌───────────┘
                              ▼               ▼
                         ┌─────────────────────┐
                         │ 50_contrib/         │
                         │                     │
                         │ Community           │
                         │ contributions       │
                         └─────────────────────┘
```

## What You'll Learn

| Concept | What It Is | Why It Matters |
|---------|------------|----------------|
| **Token Budget** | Optimizing every token in your context | More tokens = more $$ and slower responses |
| **Few-Shot Learning** | Teaching by showing examples | Often works better than explanation alone |
| **Memory Systems** | Persisting information across turns | Enables stateful, coherent interactions |
| **Retrieval Augmentation** | Finding & injecting relevant documents | Grounds responses in facts, reduces hallucination |
| **Control Flow** | Breaking complex tasks into steps | Solve harder problems with simpler prompts |
| **Context Pruning** | Removing irrelevant information | Keep only what's necessary for performance |
| **Metrics & Evaluation** | Measuring context effectiveness | Iterative optimization of token use vs. quality |
| **Cognitive Tools & Prompt Programming** | Learm to build custom tools and templates | Prompt programming enables new layers for context engineering |
| **Neural Field Theory** | Context as a Neural Field | Modeling context as a dynamic neural field allows for iterative context updating |
| **Symbolic Mechanisms** | Symbolic architectures enable higher order reasoning | Smarter systems = less work |
| **Quantum Semantics** |  Meaning as observer-dependent  | Design context systems leveraging superpositional techniques |



## Karpathy + 3Blue1Brown Inspired Style

> For learners of all experience levels

1. **First principles** – start with the fundamental context
2. **Iterative add-on** – add only what the model demonstrably lacks
3. **Measure everything** – token cost, latency, quality score
4. **Delete ruthlessly** – pruning beats padding
5. **Code > slides** – every concept has a runnable cell
6. **Visualize everything** — every concept is visualized with ASCII and symbolic diagrams

# Research Evidence 
## Memory + Reasoning

### **[MEM1: Learning to Synergize Memory and Reasoning for Efficient Long-Horizon Agents - Singapore-MIT June 2025](https://www.arxiv.org/pdf/2506.12115)**

> “Our results demonstrate the promise of reasoning-driven memory consolidation as a scalable alternative to existing solutions for training long-horizon interactive agents, where both efficiency and performance are optimized." — [Singapore-MIT](https://arxiv.org/pdf/2506.15841)

![image](https://github.com/user-attachments/assets/16e3f241-5f44-4ed5-9622-f0b4acbb67b0)

1. **MEM1 trains AI agents to keep only what matters—merging memory and reasoning at every step—so they never get overwhelmed, no matter how long the task.**

2. **Instead of piling up endless context, MEM1 compresses each interaction into a compact “internal state,” just like a smart note that gets updated, not recopied.**

3. **By blending memory and thinking into a single flow, MEM1 learns to remember only the essentials—making agents faster, sharper, and able to handle much longer conversations.**

4. **Everything the agent does is tagged and structured, so each action, question, or fact is clear and easy to audit—no more mystery meat memory.**

5. **With every cycle, old clutter is pruned and only the latest, most relevant insights are carried forward, mirroring how expert problem-solvers distill their notes.**

6. **MEM1 proves that recursive, protocol-driven memory—where you always refine and integrate—outperforms traditional “just add more context” approaches in both speed and accuracy.**
## Cognitive Tools

### **[Eliciting Reasoning in Language Models with Cognitive Tools - IBM Zurich June 2025](https://www.arxiv.org/pdf/2506.12115)**

### Prompts and Prompt Programs as Reasoning Tool Calls
> “Cognitive tools” encapsulate reasoning operations within the LLM itself — [IBM Zurich](https://www.arxiv.org/pdf/2506.12115)



![image](https://github.com/user-attachments/assets/cd06c3f5-5a0b-4ee7-bbba-2f9f243f70ae)

> **These cognitive tools (structured prompt templates as tool calls) break down the problem by identifying the main concepts at hand, extracting relevant information in the question, and highlighting meaningful properties, theorems, and techniques that
might be helpful in solving the problem.**

![image](https://github.com/user-attachments/assets/f7ce8605-6fa3-494f-94cd-94e6b23032b6)


> **These templates scaffold reasoning layers similar to cognitive mental shortcuts, commonly studied as "heuristics".**

1. **This research shows that breaking complex tasks into modular “cognitive tools” lets AI solve problems more thoughtfully—mirroring how expert humans reason step by step.**

2. **Instead of relying on a single, big prompt, the model calls specialized prompt templates, aka cognitive tools like “understand question,” “recall related,” “examine answer,” and “backtracking”—each handling a distinct mental operation.**

3. **Cognitive tools work like inner mental shortcuts: the AI picks the right program at each stage and runs it to plan its reasoning and downstream actions before conducting the task for greater accuracy and flexibility.**

4. **By compartmentalizing reasoning steps into modular blocks, these tools prevent confusion, reduce error, and make the model’s thought process transparent and auditable—even on hard math problems.**

5. **This modular approach upgrades both open and closed models—boosting real-world math problem-solving and approaching the performance of advanced RL-trained “reasoning” models, without extra training.**

6. **The results suggest that the seeds of powerful reasoning are already inside large language models—cognitive tools simply unlock and orchestrate these abilities, offering a transparent, efficient, and interpretable alternative to black-box tuning.**
## Emergent Symbols

## **[Emergent Symbolic Mechanisms Support Abstract Reasoning in Large Language Models - ICML Princeton June 18, 2025](https://openreview.net/forum?id=y1SnRPDWx4)**


![image](https://github.com/user-attachments/assets/76c6e6cb-b65d-4af7-95a5-6d52aee7efc0)

> **TL;DR: A three-stage architecture is identified that supports abstract reasoning in LLMs via a set of emergent symbol-processing mechanisms.**
>
>


**These include symbolic induction heads, symbolic abstraction heads, and retrieval heads.**

**1. In early layers, symbol abstraction heads convert input tokens to abstract variables based on the relations between those tokens.**

**2. In intermediate layers, symbolic induction heads perform sequence induction over these abstract variables.**

**3. Finally, in later layers, retrieval heads predict the next token by retrieving the value associated with the predicted abstract variable.**

**These results point toward a resolution of the longstanding debate between symbolic and neural network approaches, suggesting that emergent reasoning in neural networks depends on the emergence of symbolic mechanisms.** — [**ICML Princeton**](https://openreview.net/forum?id=y1SnRPDWx4) 


![image](https://github.com/user-attachments/assets/2428544e-332a-4e32-9070-9f9d8716d491)


>
> **Why Useful?**
>
>
> **This supports why Markdown, Json, and similar structured, symbolic formats are more easily LLM parsable**
>
> **Concept: Collaborate with agents to apply delimiters, syntax, symbols, symbolic words, metaphors and structure to improve reasoning/context/memory/persistence during inference**

1. **This paper proves that large language models develop their own inner symbolic “logic circuits”—enabling them to reason with abstract variables, not just surface word patterns.**

2. **LLMs show a three-stage process: first abstracting symbols from input, then reasoning over these variables, and finally mapping the abstract answer back to real-world tokens.**

3. **These emergent mechanisms mean LLMs don’t just memorize—they actually create internal, flexible representations that let them generalize to new problems and analogies.**

4. **Attention heads in early layers act like “symbol extractors,” intermediate heads perform symbolic reasoning, and late heads retrieve the concrete answer—mirroring human-like abstraction and retrieval.**

5. **By running targeted experiments and interventions, the authors show these symbolic processes are both necessary and sufficient for abstract reasoning, across multiple models and tasks.**

6. **The results bridge the historic gap between symbolic AI and neural nets—showing that, at scale, neural networks can invent and use symbolic machinery, supporting real generalization and reasoning.**



## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=davidkimai/Context-Engineering&type=Date)](https://www.star-history.com/#davidkimai/Context-Engineering&Date)

## Contributing

We welcome contributions! Check out [CONTRIBUTING.md](.github/CONTRIBUTING.md) for guidelines.

## License

[MIT License](LICENSE)

## Citation

```bibtex
@misc{context-engineering,
  author = {Context Engineering Contributors},
  title = {Context Engineering: Beyond Prompt Engineering},
  year = {2025},
  publisher = {GitHub},
  url = {https://github.com/davidkimai/context-engineering}
}
```

## Acknowledgements
> I've been looking forward to this being conceptualized and formalized as there wasn't a prior established field. Prompt engineering receives quite the stigma and doesn't quite cover what most researchers and I do.

- [Andrej Karpathy](https://x.com/karpathy/status/1937902205765607626) for coining "context engineering" and inspiring this repo 
- All contributors and the open source community
