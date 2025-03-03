export const mockPdbData = {
  '6LU7': {
    struct: {
      title: "SARS-CoV-2 main protease in complex with an inhibitor N3"
    },
    rcsb_primary_citation: {
      title: "Crystal structure of SARS-CoV-2 main protease provides a basis for design of improved α-ketoamide inhibitors",
      journal_abbrev: "Science",
      year: 2020
    },
    rcsb_entry_info: {
      molecular_weight: 34371.26,
      deposited_polymer_monomer_count: 306,
      deposited_atom_count: 2486,
      polymer_entity_count_protein: 1,
      ligand_count: 3
    },
    pdbx_struct_site: [
      {
        id: "AC1",
        details: "ACTIVE SITE",
        pdbx_evidence_code: "Software",
        pdbx_site_details: "Catalytic dyad: HIS41, CYS145"
      }
    ],
    nonpolymer_entities: [
      {
        nonpolymer_comp: {
          id: "N3",
          name: "1-{N-[(5-methylisoxazol-3-yl)carbonyl]alanyl}-N-(4-{[(3R)-1-(cyclohexylmethyl)pyrrolidin-3-yl]oxy}phenyl)pyrrolidine-2-carboxamide"
        },
        rcsb_nonpolymer_entity_container_identifiers: {
          comp_id: "N3"
        }
      }
    ],
    polymer_entities: [
      {
        rcsb_polymer_entity_container_identifiers: {
          uniprot_ids: ["P0DTD1"]
        },
        rcsb_entity_polymer_type: "Protein"
      }
    ]
  },
  
  // Non-existent PDB ID
  'XXXX': null,
  
  // More mock data for other test cases...
};

export const mockUniprotData = {
  'P0DTD1': {
    comments: [
      {
        commentType: "FUNCTION",
        texts: [
          {
            value: "Cleaves the polyprotein at the 3C-like protease self-cleavage site to release the mature protease protein. Mediates the maturation cleavage between non-structural proteins to generate nsps essential for viral replication."
          }
        ]
      }
    ]
  }
};

export const mockDiseaseSearchResults = {
  covid: {
    result_set: [
      { identifier: "6LU7" },
      { identifier: "7L0D" },
      { identifier: "7BZ5" },
      { identifier: "7BW4" },
      { identifier: "7K3T" }
    ]
  },
  alzheimer: {
    result_set: [
      { identifier: "1IYT" },
      { identifier: "2BEG" },
      { identifier: "1TAU" },
      { identifier: "2NAO" },
      { identifier: "6VIE" }
    ]
  }
};
