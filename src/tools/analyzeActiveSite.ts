import { z } from "zod";
import { 
    makeApiRequest,
    RCSB_PDB_DATA_API,
    UNIPROT_API_BASE
} from "../utils.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Define interfaces for API responses
interface StructureData {
    struct?: {
        title?: string;
        pdbx_descriptor?: string;
    };
    rcsb_primary_citation?: {
        title?: string;
        journal_abbrev?: string;
        year?: number;
    };
    rcsb_entry_info?: {
        molecular_weight?: number;
        deposited_polymer_monomer_count?: number;
        deposited_atom_count?: number;
        polymer_entity_count_protein?: number;
        ligand_count?: number;
    };
}

interface BindingSite {
    id?: string;
    rcsb_id?: string;
    details?: string;
    pdbx_evidence_code?: string;
    pdbx_site_details?: string;
}

interface PolymerEntityAnnotation {
    type?: string;
    description?: string;
    annotation_lineage?: Array<{
        name?: string;
    }>;
}

interface PolymerEntity {
    rcsb_polymer_entity_annotation?: PolymerEntityAnnotation[];
    rcsb_polymer_entity_container_identifiers?: {
        uniprot_ids?: string[];
    };
}

interface LigandEntity {
    pdbx_entity_nonpoly?: {
        comp_id?: string;
        name?: string;
    };
    rcsb_nonpolymer_entity_container_identifiers?: {
        comp_id?: string;
    };
    chem_comp_id?: string;
    chem_comp_name?: string;
    type?: string;
    id?: string;
    name?: string;
}

interface UniprotData {
    comments?: Array<{
        commentType: string;
        texts?: Array<{
            value: string;
        }>;
    }>;
}

interface SiteResidue {
    site_id?: string;
    label_comp_id?: string;
    label_seq_id?: number;
    label_asym_id?: string;
}

// Define the tool schema
export const analyzeActiveSiteSchema = {
    pdbId: z.string().describe("The PDB ID of the protein structure to analyze (e.g., 6LU7)"),
};

/**
 * Analyze the active site of a protein structure
 */
export async function analyzeActiveSite({ pdbId }: { pdbId: string }, extra: RequestHandlerExtra): Promise<CallToolResult> {
    console.error(`Processing analyze-active-site request for PDB ID: ${pdbId}`);
    
    // Normalize PDB ID format (uppercase)
    pdbId = pdbId.toUpperCase();
    
    // Use REST API to get basic structure data
    const entryUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}`;
    
    const structureData = await makeApiRequest(entryUrl) as StructureData;
    
    if (!structureData) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to retrieve structure data for PDB ID: ${pdbId}. Please verify this is a valid PDB ID.`,
                },
            ],
        };
    }
    
    // Extract title with fallback options
    const title = structureData.struct?.title || 
                  structureData.struct?.pdbx_descriptor || 
                  (structureData.rcsb_primary_citation?.title) ||
                  "Unknown protein";
    
    let activeSiteText = `Analysis of ${pdbId}: ${title}\n\n`;
    
    // Add structure summary information
    if (structureData.rcsb_entry_info) {
        const info = structureData.rcsb_entry_info;
        activeSiteText += "Structure Summary:\n";
        
        if (info.molecular_weight) {
            activeSiteText += `Molecular Weight: ${info.molecular_weight.toLocaleString()} Da\n`;
        }
        
        if (info.deposited_polymer_monomer_count) {
            activeSiteText += `Residue Count: ${info.deposited_polymer_monomer_count.toLocaleString()}\n`;
        }
        
        if (info.deposited_atom_count) {
            activeSiteText += `Atom Count: ${info.deposited_atom_count.toLocaleString()}\n`;
        }
        
        if (info.polymer_entity_count_protein) {
            activeSiteText += `Protein Chains: ${info.polymer_entity_count_protein}\n`;
        }
        
        if (info.ligand_count) {
            activeSiteText += `Ligand Count: ${info.ligand_count}\n`;
        }
        
        activeSiteText += "\n";
    }
    
    // Get binding site information
    const structSiteUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/struct_site`;
    const structSiteData = await makeApiRequest(structSiteUrl) as BindingSite[];
    
    if (structSiteData && Array.isArray(structSiteData) && structSiteData.length > 0) {
        activeSiteText += "Binding Site Information:\n";
        structSiteData.forEach((site: BindingSite, index: number) => {
            activeSiteText += `Site ${index + 1} (${site.id || site.rcsb_id || "Unknown"}):\n`;
            
            if (site.details) {
                activeSiteText += `Description: ${site.details}\n`;
            }
            
            if (site.pdbx_evidence_code) {
                activeSiteText += `Evidence: ${site.pdbx_evidence_code}\n`;
            }
            
            if (site.pdbx_site_details) {
                activeSiteText += `Additional details: ${site.pdbx_site_details}\n`;
            }
            
            activeSiteText += "\n";
        });
    } else {
        // Try alternative approach: active site residue information
        
        // Check for polymer entities with Uniprot annotations that might have active site information
        const polymerUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/polymer_entity`;
        const polymerData = await makeApiRequest(polymerUrl) as PolymerEntity[];
        
        let foundActiveSiteInfo = false;
        
        if (polymerData && Array.isArray(polymerData)) {
            for (const entity of polymerData) {
                // Check if entity has Uniprot features with active site annotations
                if (entity.rcsb_polymer_entity_annotation && 
                    Array.isArray(entity.rcsb_polymer_entity_annotation)) {
                    
                    const activeSiteAnnotations = entity.rcsb_polymer_entity_annotation.filter(
                        (ann: PolymerEntityAnnotation) => ann.type && 
                        (ann.type.toLowerCase().includes('active site') || 
                         ann.type.toLowerCase().includes('binding site') ||
                         ann.type.toLowerCase().includes('site'))
                    );
                    
                    if (activeSiteAnnotations.length > 0) {
                        foundActiveSiteInfo = true;
                        activeSiteText += "Active/Binding Site Annotations:\n";
                        
                        activeSiteAnnotations.forEach((ann: PolymerEntityAnnotation, index: number) => {
                            activeSiteText += `Annotation ${index + 1} (${ann.type || "Unknown"}):\n`;
                            if (ann.description) {
                                activeSiteText += `Description: ${ann.description}\n`;
                            }
                            if (ann.annotation_lineage) {
                                activeSiteText += `Classification: ${ann.annotation_lineage.map((a) => a.name).join(' > ')}\n`;
                            }
                            activeSiteText += "\n";
                        });
                    }
                }
            }
        }
        
        if (!foundActiveSiteInfo) {
            activeSiteText += "No binding site information available in the structure data.\n\n";
        }
    }
    
    // Get ligand (nonpolymer entity) information
    const ligandsUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/nonpolymer_entity`;
    const ligandsData = await makeApiRequest(ligandsUrl) as LigandEntity[];
    
    let foundLigandInfo = false;
    
    if (ligandsData && Array.isArray(ligandsData) && ligandsData.length > 0) {
        foundLigandInfo = true;
        activeSiteText += "Ligands:\n";
        ligandsData.forEach((ligand: LigandEntity) => {
            const compId = ligand.pdbx_entity_nonpoly?.comp_id || 
                          ligand.rcsb_nonpolymer_entity_container_identifiers?.comp_id || 
                          "Unknown";
            
            const name = ligand.pdbx_entity_nonpoly?.name || "Unknown";
            activeSiteText += `- ${compId}: ${name}\n`;
        });
        activeSiteText += "\n";
    } 
    
    if (!foundLigandInfo) {
        // Try alternate API endpoint for ligands
        const alternateLigandsUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/ligands`;
        const alternateLigandsData = await makeApiRequest(alternateLigandsUrl) as LigandEntity[];
        
        if (alternateLigandsData && Array.isArray(alternateLigandsData) && alternateLigandsData.length > 0) {
            foundLigandInfo = true;
            activeSiteText += "Ligands:\n";
            alternateLigandsData.forEach((ligand: LigandEntity) => {
                const compId = ligand.chem_comp_id || "Unknown";
                const name = ligand.chem_comp_name || "Unknown";
                activeSiteText += `- ${compId}: ${name}\n`;
            });
            activeSiteText += "\n";
        }
    }
    
    // Try one more approach - using the PDB chemical component data
    if (!foundLigandInfo) {
        const chemCompUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/chem_comp`;
        const chemCompData = await makeApiRequest(chemCompUrl) as LigandEntity[];
        
        if (chemCompData && Array.isArray(chemCompData) && chemCompData.length > 0) {
            // Filter out standard amino acids and nucleotides
            const standardResidues = new Set([
                'ALA', 'ARG', 'ASN', 'ASP', 'CYS', 'GLN', 'GLU', 'GLY', 'HIS', 'ILE', 
                'LEU', 'LYS', 'MET', 'PHE', 'PRO', 'SER', 'THR', 'TRP', 'TYR', 'VAL',
                'A', 'C', 'G', 'T', 'U', 'DA', 'DC', 'DG', 'DT', 'DU'
            ]);
            
            const ligandComps = chemCompData.filter((comp: LigandEntity) => 
                !standardResidues.has(comp.id || '') && 
                comp.type !== 'POLYMER' &&
                comp.type !== 'AMINO ACID'
            );
            
            if (ligandComps.length > 0) {
                foundLigandInfo = true;
                activeSiteText += "Ligands and Chemical Components:\n";
                ligandComps.forEach((comp: LigandEntity) => {
                    activeSiteText += `- ${comp.id}: ${comp.name || 'Unknown'} (${comp.type || 'Unknown type'})\n`;
                });
                activeSiteText += "\n";
            }
        }
        
        if (!foundLigandInfo) {
            activeSiteText += "No ligand information available.\n\n";
        }
    }
    
    // Get polymer entity information to extract UniProt IDs
    const polymerUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/polymer_entity`;
    const polymerData = await makeApiRequest(polymerUrl) as PolymerEntity[];
    
    // Extract UniProt IDs from polymer entities
    let uniprotIds: string[] = [];
    
    if (polymerData && Array.isArray(polymerData)) {
        polymerData.forEach((entity: PolymerEntity) => {
            if (entity.rcsb_polymer_entity_container_identifiers?.uniprot_ids) {
                uniprotIds = uniprotIds.concat(entity.rcsb_polymer_entity_container_identifiers.uniprot_ids);
            }
        });
    }
    
    // Get UniProt data if available
    if (uniprotIds.length > 0) {
        const uniprotId = uniprotIds[0];
        const uniprotUrl = `${UNIPROT_API_BASE}/${uniprotId}`;
        const uniprotData = await makeApiRequest(uniprotUrl) as UniprotData;
        
        if (uniprotData) {
            activeSiteText += `\nProtein Function (from UniProt ${uniprotId}):\n`;
            try {
                if (uniprotData.comments) {
                    const functionComments = uniprotData.comments.filter((c) => c.commentType === "FUNCTION") || [];
                    if (functionComments.length > 0 && functionComments[0].texts && functionComments[0].texts.length > 0) {
                        activeSiteText += functionComments[0].texts[0].value;
                    } else {
                        activeSiteText += "No function information available in UniProt.";
                    }
                } else {
                    activeSiteText += "Function information not available.";
                }
            } catch (error) {
                console.error("Error processing UniProt data:", error);
                activeSiteText += "Error processing UniProt data.";
            }
            activeSiteText += "\n\n";
        }
    }
    
    // Get binding site residue details
    const structSiteResiduesUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/struct_site_gen`;
    const siteResiduesData = await makeApiRequest(structSiteResiduesUrl) as SiteResidue[];
    
    if (siteResiduesData && Array.isArray(siteResiduesData) && siteResiduesData.length > 0) {
        // Group residues by site ID
        const siteResiduesMap: {[key: string]: SiteResidue[]} = {};
        
        siteResiduesData.forEach((residue: SiteResidue) => {
            const siteId = residue.site_id || '';
            if (!siteResiduesMap[siteId]) {
                siteResiduesMap[siteId] = [];
            }
            siteResiduesMap[siteId].push(residue);
        });
        
        // Add residue information for each site
        Object.keys(siteResiduesMap).forEach(siteId => {
            activeSiteText += `Residues in site ${siteId}:\n`;
            
            siteResiduesMap[siteId].forEach((residue: SiteResidue) => {
                activeSiteText += `- ${residue.label_comp_id || "?"} ${residue.label_seq_id || "?"} (Chain ${residue.label_asym_id || "?"})\n`;
            });
            
            activeSiteText += "\n";
        });
    }
    
    // Add a link to view the structure in 3D
    activeSiteText += `View this structure in 3D: https://www.rcsb.org/structure/${pdbId}`;
    
    return {
        content: [
            {
                type: "text",
                text: activeSiteText,
            },
        ],
    };
}
