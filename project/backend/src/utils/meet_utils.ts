import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { cleanAppStateForExport } from '@excalidraw/excalidraw/appState';
import type { BinaryFiles } from '@excalidraw/excalidraw/types';

// typescript is stupid so I have to recreate this lol
interface ExportedDataState {
  type: string;
  version: number;
  source: string;
  elements: readonly ExcalidrawElement[];
  appState: ReturnType<typeof cleanAppStateForExport>;
  files: BinaryFiles | undefined;
}

type OtherExcalidrawState = Omit<ExportedDataState, 'elements'>;

export class Environ {
  private last_updated_unix: number;
  private elements: readonly ExcalidrawElement[];
  private other_state: OtherExcalidrawState;
  public owner: string;

  constructor(state: ExportedDataState, owner: string) {
    this.elements = state.elements;
    this.other_state = state;
    this.owner = owner;
    this.last_updated_unix = Date.now();
  }

  static fromString(data: string, owner: string): Environ {
    return new Environ(JSON.parse(data) as ExportedDataState, owner);
  }

  public serialize(pos?: [number, number]): string {
    const other_state = this.other_state;
    if (pos) {
      // @ts-expect-error scrollX is present but ts is stupid
      other_state.appState.scrollX = pos[0];
      // @ts-expect-error scrollY is present but ts is stupid
      other_state.appState.scrollY = pos[1];
    }

    return JSON.stringify({
      ...other_state,
      elements: this.elements,
    });
  }

  public update(other: Environ) {
    const newer =
      other.last_updated_unix > this.last_updated_unix ? other : this;
    const older =
      other.last_updated_unix > this.last_updated_unix ? this : other;

    const elements: Record<string, ExcalidrawElement> = Object.fromEntries(
      newer.elements.map((el) => [el.id, el]),
    );

    older.elements.forEach((el) => {
      if (elements[el.id] === undefined) {
        elements[el.id] = el;
      }
    });

    this.other_state = newer.other_state;
    this.elements = Object.values(elements).filter((el) => !el.isDeleted);
    this.last_updated_unix = newer.last_updated_unix;
    this.owner = newer.owner;
  }

  public elements_equal(other: Environ): boolean {
    type IdComparing = { id: string; version: number };

    const my_ids: IdComparing[] = this.elements
      .map((el) => ({ id: el.id, version: el.version }))
      .toSorted((a, b) => a.id.localeCompare(b.id));
    const other_ids: IdComparing[] = other.elements
      .map((el) => ({ id: el.id, version: el.version }))
      .toSorted((a, b) => a.id.localeCompare(b.id));

    for (let i = 0; i < my_ids.length; i++) {
      if (other_ids[i] != my_ids[i]) return false;
    }

    return true;
  }
}
