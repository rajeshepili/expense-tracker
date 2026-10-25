import { useState, type Dispatch, type SetStateAction } from 'react'

export type ComposerState<TForm, TEditing> = {
  editing: TEditing | null
  form: TForm
  saveError: string | null
  composerOpen: boolean
  setEditing: (row: TEditing | null) => void
  setForm: Dispatch<SetStateAction<TForm>>
  setSaveError: (error: string | null) => void
  setComposerOpen: (open: boolean) => void
  openCreate: () => void
  openEdit: (row: TEditing) => void
  reset: () => void
}

export function useComposer<TForm, TEditing = TForm>({
  emptyForm,
  formFromRow,
}: {
  emptyForm: () => TForm
  formFromRow: (row: TEditing) => TForm
}): ComposerState<TForm, TEditing> {
  const [editing, setEditing] = useState<TEditing | null>(null)
  const [form, setForm] = useState<TForm>(emptyForm)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)

  function openCreate() {
    setEditing(null)
    setSaveError(null)
    setForm(emptyForm())
    setComposerOpen(true)
  }

  function openEdit(row: TEditing) {
    setEditing(row)
    setSaveError(null)
    setForm(formFromRow(row))
    setComposerOpen(true)
  }

  function reset() {
    setEditing(null)
    setSaveError(null)
    setForm(emptyForm())
    setComposerOpen(false)
  }

  return {
    editing,
    form,
    saveError,
    composerOpen,
    setEditing,
    setForm,
    setSaveError,
    setComposerOpen,
    openCreate,
    openEdit,
    reset,
  }
}
