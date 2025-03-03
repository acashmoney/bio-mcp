import { z } from "zod";
import { 
    makeApiRequest,
    RCSB_PDB_DATA_API,
    UNIPROT_API_BASE
} from "../utils.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Define the tool schema
export const analyzeActiveSiteSchema = {
    pdbId: z.string().describe("The PDB ID of the protein structure to analyze (e.g., 6LU7)"),
};

/**
 * Analyze the active site of a protein structure
 */
export async function analyzeActiveSite({ pdbId }: { pdbId: string }, extra: RequestHandlerExtra): Promise<CallToolResult> {
    console.error(`DEBUG: Processing analyze-active-site request for PDB ID: ${pdbId}`);
    
    // Normalize PDB ID format (uppercase)
    pdbId = pdbId.toUpperCase();
    console.error(`DEBUG: Normalized PDB ID to: ${pdbId}`);
    
    // Use REST API to get basic structure data
    const entryUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}`;
    console.error(`DEBUG: Making REST API request for structure data: ${entryUrl}`);
    
    const structureData: any = await makeApiRequest(entryUrl);
    
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
    console.error(`DEBUG: Retrieved structure title: ${title}`);
    
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
    console.error(`DEBUG: Fetching binding site information via REST API`);
    const structSiteUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/struct_site`;
    const structSiteData: any = await makeApiRequest(structSiteUrl);
    
    if (structSiteData && Array.isArray(structSiteData)) {
        activeSiteText += "Binding Site Information:\n";
        structSiteData.forEach((site: any, index: number) => {
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
        activeSiteText += "No binding site information available in the structure data.\n\n";
    }
    
    // Get ligand (nonpolymer entity) information
    console.error(`DEBUG: Fetching ligand information via REST API`);
    const ligandsUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/nonpolymer_entity`;
    const ligandsData: any = await makeApiRequest(ligandsUrl);
    
    if (ligandsData && Array.isArray(ligandsData) && ligandsData.length > 0) {
        activeSiteText += "Ligands:\n";
        ligandsData.forEach((ligand: any) => {
            const compId = ligand.pdbx_entity_nonpoly?.comp_id || 
                          ligand.rcsb_nonpolymer_entity_container_identifiers?.comp_id || 
                          "Unknown";
            
            const name = ligand.pdbx_entity_nonpoly?.name || "Unknown";
            activeSiteText += `- ${compId}: ${name}\n`;
        });
        activeSiteText += "\n";
    } else {
        // Try alternate API endpoint for ligands
        const alternateLigandsUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/ligands`;
        const alternateLigandsData: any = await makeApiRequest(alternateLigandsUrl);
        
        if (alternateLigandsData && Array.isArray(alternateLigandsData) && alternateLigandsData.length > 0) {
            activeSiteText += "Ligands:\n";
            alternateLigandsData.forEach((ligand: any) => {
                const compId = ligand.chem_comp_id || "Unknown";
                const name = ligand.chem_comp_name || "Unknown";
                activeSiteText += `- ${compId}: ${name}\n`;
            });
            activeSiteText += "\n";
        } else {
            activeSiteText += "No ligand information available.\n\n";
        }
    }
    
    // Get polymer entity information to extract UniProt IDs
    console.error(`DEBUG: Fetching polymer entity information via REST API`);
    const polymerUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/polymer_entity`;
    const polymerData: any = await makeApiRequest(polymerUrl);
    
    // Extract UniProt IDs from polymer entities
    let uniprotIds: string[] = [];
    
    if (polymerData && Array.isArray(polymerData)) {
        polymerData.forEach((entity: any) => {
            if (entity.rcsb_polymer_entity_container_identifiers?.uniprot_ids) {
                uniprotIds = uniprotIds.concat(entity.rcsb_polymer_entity_container_identifiers.uniprot_ids);
            }
        });
    }
    
    // Get UniProt data if available
    if (uniprotIds.length > 0) {
        const uniprotId = uniprotIds[0];
        console.error(`DEBUG: Found UniProt ID: ${uniprotId}, fetching details`);
        const uniprotUrl = `${UNIPROT_API_BASE}/${uniprotId}`;
        const uniprotData: any = await makeApiRequest(uniprotUrl);
        
        if (uniprotData) {
            activeSiteText += `\nProtein Function (from UniProt ${uniprotId}):\n`;
            try {
                if (uniprotData.comments) {
                    const functionComments = uniprotData.comments.filter((c: any) => c.commentType === "FUNCTION") || [];
                    if (functionComments.length > 0 && functionComments[0].texts && functionComments[0].texts.length > 0) {
                        activeSiteText += functionComments[0].texts[0].value;
                    } else {
                        activeSiteText += "No function information available in UniProt.";
                    }
                } else {
                    activeSiteText += "Function information not available.";
                }
            } catch (error) {
                console.error("DEBUG: Error processing UniProt data:", error);
                activeSiteText += "Error processing UniProt data.";
            }
            activeSiteText += "\n\n";
        }
    }
    
    // Get binding site residue details
    console.error(`DEBUG: Fetching binding site residue details`);
    const structSiteResiduesUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}/struct_site_gen`;
    const siteResiduesData: any = await makeApiRequest(structSiteResiduesUrl);
    
    if (siteResiduesData && Array.isArray(siteResiduesData) && siteResiduesData.length > 0) {
        // Group residues by site ID
        const siteResiduesMap: {[key: string]: any[]} = {};
        
        siteResiduesData.forEach((residue: any) => {
            const siteId = residue.site_id;
            if (!siteResiduesMap[siteId]) {
                siteResiduesMap[siteId] = [];
            }
            siteResiduesMap[siteId].push(residue);
        });
        
        // Add residue information for each site
        Object.keys(siteResiduesMap).forEach(siteId => {
            activeSiteText += `Residues in site ${siteId}:\n`;
            
            siteResiduesMap[siteId].forEach((residue: any) => {
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
