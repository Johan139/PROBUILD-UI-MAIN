import { JobDocument } from "./JobDocument";

export interface JobResponse {
    id: number;
    projectName: string;
    jobType: string;
    qty: number;
    desiredStartDate: string;
    wallStructure: string;
    wallStructureSubtask: string | null;
    wallInsulation: string;
    wallInsulationSubtask: string | null;
    roofStructure: string;
    roofStructureSubtask: string | null;
    roofTypeSubtask: string | null;
    roofInsulation: string;
    roofInsulationSubtask: string | null;
    foundation: string;
    foundationSubtask: string | null;
    finishes: string;
    finishesSubtask: string | null;
    electricalSupplyNeeds: string;
    electricalSupplyNeedsSubtask: string | null;
    stories: number;
    buildingSize: number;
    status: string;
    blueprintPath: string;
    operatingArea: string;
    userId: string;
    address: string;
    user: any | null;
    bids: any | null;
    latitude: any | null;
    longitude: any| null;
    documents?: JobDocument[]; // Add the list of associated documents
  }
  