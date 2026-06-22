export type Exercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  is_default: boolean;
};

export type Routine = {
  id: string;
  name: string;
};

export type RoutineItem = {
  id: string;
  exercise_id: string;
  order_index: number;
  default_sets: number;
  exercise: Exercise;
};

export type RoutineDetail = {
  id: string;
  name: string;
  items: RoutineItem[];
};
