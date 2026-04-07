import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

export function ConfirmDeleteModal({
  open,
  title = 'Are you sure?',
  onCancel,
  onConfirm,
}: {
  open: boolean
  title?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-50">
      <div className="fixed inset-0 bg-surface-dark/35 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-xl bg-surface p-5 shadow-xl border border-brand-100">
          <DialogTitle as={DialogTitle} className="text-base font-semibold text-surface-dark">
            {title}
          </DialogTitle>
          <p className="mt-2 text-sm text-surface-text">Are you sure? This cannot be undone.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-brand-100 px-3 py-2 text-sm font-semibold text-surface-dark hover:bg-brand-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="rounded-md bg-brand px-3 py-2 text-sm font-semibold text-surface hover:bg-brand-dark"
            >
              Delete
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}

