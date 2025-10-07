import api from './api'

export interface PublishToFacebookRequest {
    itemIds: string[]
    message: string
    includePrice?: boolean
}

export interface PublishToFacebookResponse {
    success: boolean
    message: string
    postId?: string
    itemsPublished?: number
    error?: string
}

export interface FacebookConfigResponse {
    configured: boolean
    message?: string
    page?: {
        id: string
        name: string
        picture?: any
    }
}

/**
 * Publish selected inventory items to Facebook
 */
export const publishToFacebook = async (data: PublishToFacebookRequest): Promise<PublishToFacebookResponse> => {
    const response = await api.post<PublishToFacebookResponse>('/facebook/publish', data)
    return response.data
}

/**
 * Verify if Facebook is configured
 */
export const verifyFacebookConfig = async (): Promise<FacebookConfigResponse> => {
    const response = await api.get<FacebookConfigResponse>('/facebook/verify')
    return response.data
}
