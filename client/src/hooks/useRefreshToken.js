import { useCallback, useState } from 'react'

export const useRefreshToken = () => {
    const [refreshToken, setRefreshToken] = useState(0)
    const refresh = useCallback(() => setRefreshToken((value) => value + 1), [])
    return { refreshToken, refresh }
}
