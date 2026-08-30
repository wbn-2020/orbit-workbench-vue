import { workbenchSnapshot } from '@/mocks/workbench'
import type { WorkbenchSnapshot } from '@/types/workbench'

function cloneSnapshot(): WorkbenchSnapshot {
  return structuredClone(workbenchSnapshot)
}

export async function getWorkbenchSnapshot(): Promise<WorkbenchSnapshot> {
  return cloneSnapshot()
}
