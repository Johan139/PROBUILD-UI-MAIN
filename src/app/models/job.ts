export class Job {
    id!: string;
    name!: string;
    title!: string;
    description!: string;
    status!: string;
    address!: {
      latitude: number;
      longitude: number;
    };
  }
