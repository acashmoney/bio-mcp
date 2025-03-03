# BioMCP Example Prompts

## Comprehensive Research Workflows
- "As an infectious disease researcher, I need to identify the three most prevalent infectious diseases currently impacting sub-Saharan Africa. Please find relevant proteins for these diseases, analyze the binding sites of these proteins, and compile all findings into a comparison table. Include citations to relevant literature where possible."

- "I'm a neurodegenerative disease specialist examining potential drug targets. Please identify key proteins involved in Alzheimer's, Parkinson's, and Huntington's diseases. For each disease, analyze the binding sites of the most promising therapeutic target protein and create a detailed report highlighting similarities and differences that could inform drug development. Please cite relevant research papers throughout your analysis."

- "As a cancer immunotherapy researcher, I'm investigating checkpoint inhibitors. Identify the three most studied checkpoint proteins in cancer therapy, examine their binding interfaces with antibodies, and present a structural analysis of how these interactions disrupt immune evasion by tumors. Include citations to seminal papers and recent findings where appropriate."

- "I'm developing antivirals against emerging threats. Please identify three RNA viruses with pandemic potential, determine their essential protease structures, analyze the conserved features of their active sites, and suggest possible broad-spectrum inhibitor design strategies based on structural commonalities. Cite relevant literature for each virus and for your structural insights."

- "As an antibiotic resistance researcher, I need to understand structural adaptations in bacterial proteins. Identify three beta-lactamase enzymes from different resistant bacterial strains, analyze their active sites, and create a visual comparison highlighting the structural differences that confer resistance to current antibiotics. Please support your analysis with citations to published structural and biochemical studies."

## Multi-Step Analysis Scenarios
- "I'm researching COVID-19 treatments. First, find proteins related to COVID-19, then analyze the active site of the main protease."
- "For my Alzheimer's research, find relevant proteins and then analyze the structure of beta-amyloid."
- "I'm studying diabetes. Find insulin-related proteins and then analyze the binding site of the most relevant structure."

## Tool-Specific Examples

### For the analyze-active-site Tool
- "What can you tell me about the active site of the SARS-CoV-2 main protease? Look at PDB ID 6LU7."
- "What makes the binding pocket of HIV protease (1HSG) a good drug target?"
- "What residues in angiotensin-converting enzyme 2 (PDB: 6M17) interact with the SARS-CoV-2 spike protein?"

### For the search-disease-proteins Tool
- "What protein structures are associated with COVID-19?"
- "Find proteins related to amyotrophic lateral sclerosis (ALS)."
- "What kinase structures are associated with cancer?"

## For the analyze-active-site Tool

### Basic Functionality Tests
- "I'm studying lysozyme. Can you examine its active site structure? The PDB ID is 1LYZ."
- "What residues are important in the catalytic site of trypsin (PDB: 1PPH)?"
- "Describe the active site of acetylcholinesterase (PDB: 1EVE)."

### Disease-Specific Queries
- "I'm researching Alzheimer's disease. Can you analyze the structure of beta-amyloid (PDB: 2BEG)?"
- "For my cancer research, I need information about the binding site of EGFR (PDB: 1M17)."
- "What does the active site of influenza neuraminidase look like? Check PDB: 2HU4."
- "I'm studying diabetes. Can you analyze insulin receptor structure (PDB: 1IR3)?"
- "For my Parkinson's research, what can you tell me about alpha-synuclein structure (PDB: 1XQ8)?"

### Structure-Function Relationships
- "How does the active site of SARS-CoV-2 main protease (6LU7) compare to the original SARS virus protease?"

## For the search-disease-proteins Tool

### Common Diseases
- "What proteins are associated with Alzheimer's disease?"
- "Find proteins related to diabetes."
- "Search for cancer-related protein structures."
- "Which proteins are involved in heart disease?"
- "Find protein structures related to Parkinson's disease."

### Emerging/Specific Disease Areas
- "Search for protein structures involved in autoimmune disorders."
- "Which proteins are implicated in cystic fibrosis?"
- "Find structures related to multiple sclerosis."

### Specific Protein Types
- "Find proteases involved in viral infections."
- "Search for receptor proteins linked to neurological disorders."
- "Which ion channel structures are related to heart conditions?"

### Educational Queries
- "I'm a biology student learning about enzyme structure. Can you show me how to analyze the active site of chymotrypsin (PDB: 1YPH)?"
- "For my biochemistry class, I need to understand protein-drug interactions. Can you find HIV-related proteins and explain their binding sites?"
- "I'm teaching a class on structural biology. Can you help me find a good example of a disease-related protein with an interesting active site?"