import { useCallback, useState } from 'react'
import { useDialogState } from './useDialogState.js'
import { useRefreshToken } from './useRefreshToken.js'
import { useSelection } from './useSelection.js'

export const useListPageState = () => {
    const selection = useSelection()
    const dialog = useDialogState()
    const { refreshToken, refresh } = useRefreshToken()
    const [banner, setBanner] = useState(null)
    const clearBanner = useCallback(() => setBanner(null), [])
    return { selection, dialog, refreshToken, refresh, banner, setBanner, clearBanner }
}
