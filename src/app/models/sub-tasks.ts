import {Subtask} from './subtask';
export class SubTasks {
  wallSubtasks:Subtask[] = [
    {task:'frame wall', days:7, cost: 15000},
    {task:'sheathing', days:1, cost: 20000},
  ]
  wallInsulationSubtasks:Subtask[] = [
    {task:'insulation', days:1, cost: 3000},
    {task:'drywall', days:5, cost: 1389},
  ]
  roofStructureSubtasks:Subtask[] = [
    {task:'roof trusses', days:3, cost: 37800},
    {task:'sheathing', days:1, cost: 25600},
    {task:'roofing', days:3, cost: 4000},
    {task:'chimney & roof vents', days:1, cost: 7500},
    {task:'gutters', days:1, cost: 2000}
  ]
  roofInsulationSubtasks:Subtask[] = [
    {task:'roofing underlayment', days:1, cost: 12000},
  ]
  foundationSubtasks:Subtask[] = [
    {task:'pre-construction planning', days:4, cost: 3000},
    {task:'excavation', days:10, cost: 30000},
    {task:'foundation pour', days:1, cost: 5800},
    {task:'slab on grade', days:3, cost: 3000},
  ]
  electricalSubtasks:Subtask[] = [
    {task:'temporary power', days:2, cost: 2000},
    {task:'electrical rough-in', days:5, cost: 3000},
    {task:'cable and data lines', days:1, cost: 6700},
    {task:'complete wiring', days:4, cost: 3900},
    {task:'lighting', days:1, cost: 5890}
  ]
  finishesSubtasks:Subtask[] = [
    {task:'windows', days:2, cost: 1300},
    {task:'paint', days:3, cost: 1500},
    {task:'cabinets', days:7, cost: 15000},
    {task:'doors and millwork', days:1, cost: 20000},
    {task:'appliance installation', days:2, cost: 6000},
    {task:'deck and patio', days:3, cost: 38000},
    {task:'paving', days:3, cost: 11000},
    {task:'fencing', days:1, cost: 24000},
  ]
  plumbingTask:Subtask[]  = [
    {task:'plumbing rough in', days:1, cost: 20000},
    {task:'plumbing completion', days:2, cost: 12000},
  ]

  hvacTasks:Subtask[]  = [
    {task:'hvac rough in', days:1, cost: 30000},
    {task:'hvac completion', days:2, cost:10367 },
  ]

  map(param: (subtasks) => Subtask) {
    return [];
  }
}
