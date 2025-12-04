export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Point {
  x: number;
  y: number;
}
export interface TextLabel {
  text: string;
  position: Point;
}

export interface Room {
  id: string;
  name: string; // derived from textLabels
  boundingBox: BoundingBox;
  polygon: Point[]; // derived from polygonPoints
  textLabels?: TextLabel[];
  centerPoint?: Point;
  polygonPoints?: Point[];
  areaInSquareFeet?: number;
}
export interface Fixture {
  id: string;
  type: string;
  roomId: string;
  boundingBox: BoundingBox;
}
export interface BlueprintMetadata {
  imageWidth: number;
  imageHeight: number;
}
export interface BlueprintAnalysisData {
  metadata: BlueprintMetadata;
  rooms: Room[];
  fixtures: Fixture[];
}
