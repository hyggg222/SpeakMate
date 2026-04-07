import * as React from "react"

export function useToast() {
    const [toasts, setToasts] = React.useState<any[]>([])

    return {
        toasts,
        toast: (props: any) => {
            setToasts([...toasts, { id: Math.random().toString(), ...props }])
        },
        dismiss: (toastId?: string) => {
            setToasts(toasts.filter((t) => t.id !== toastId))
        },
    }
}

export function toast(props: any) {
    console.log('Toast triggered:', props)
}
