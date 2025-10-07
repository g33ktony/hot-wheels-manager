import axios from 'axios'
import FormData from 'form-data'

interface FacebookPostOptions {
    message: string
    imageUrls: string[]
    pageId: string
    accessToken: string
}

interface FacebookPostResult {
    success: boolean
    postId?: string
    error?: string
}

/**
 * Service to handle Facebook API interactions
 */
export class FacebookService {
    private readonly graphApiUrl = 'https://graph.facebook.com/v18.0'

    /**
     * Publish a post with multiple images to a Facebook Page
     */
    async publishPost(options: FacebookPostOptions): Promise<FacebookPostResult> {
        const { message, imageUrls, pageId, accessToken } = options

        try {
            // If only one image, use simple photo post
            if (imageUrls.length === 1) {
                return await this.publishSinglePhoto(message, imageUrls[0], pageId, accessToken)
            }

            // If multiple images, create a photo album
            return await this.publishPhotoAlbum(message, imageUrls, pageId, accessToken)
        } catch (error: any) {
            console.error('Error publishing to Facebook:', error.response?.data || error.message)
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message
            }
        }
    }

    /**
     * Publish a single photo post
     */
    private async publishSinglePhoto(
        message: string,
        imageUrl: string,
        pageId: string,
        accessToken: string
    ): Promise<FacebookPostResult> {
        try {
            const response = await axios.post(
                `${this.graphApiUrl}/${pageId}/photos`,
                {
                    url: imageUrl,
                    message: message,
                    access_token: accessToken
                }
            )

            return {
                success: true,
                postId: response.data.post_id
            }
        } catch (error: any) {
            throw error
        }
    }

    /**
     * Publish multiple photos as an album
     */
    private async publishPhotoAlbum(
        message: string,
        imageUrls: string[],
        pageId: string,
        accessToken: string
    ): Promise<FacebookPostResult> {
        try {
            // Step 1: Upload photos without publishing
            const photoIds: string[] = []

            for (const imageUrl of imageUrls) {
                const uploadResponse = await axios.post(
                    `${this.graphApiUrl}/${pageId}/photos`,
                    {
                        url: imageUrl,
                        published: false,
                        access_token: accessToken
                    }
                )
                photoIds.push(uploadResponse.data.id)
            }

            // Step 2: Create a multi-photo post
            const attachedMedia = photoIds.map(id => ({ media_fbid: id }))

            const postResponse = await axios.post(
                `${this.graphApiUrl}/${pageId}/feed`,
                {
                    message: message,
                    attached_media: JSON.stringify(attachedMedia),
                    access_token: accessToken
                }
            )

            return {
                success: true,
                postId: postResponse.data.id
            }
        } catch (error: any) {
            throw error
        }
    }

    /**
     * Verify if the access token is valid
     */
    async verifyAccessToken(accessToken: string): Promise<boolean> {
        try {
            const response = await axios.get(
                `${this.graphApiUrl}/me`,
                {
                    params: { access_token: accessToken }
                }
            )
            return !!response.data.id
        } catch (error) {
            return false
        }
    }

    /**
     * Get page information
     */
    async getPageInfo(pageId: string, accessToken: string): Promise<any> {
        try {
            const response = await axios.get(
                `${this.graphApiUrl}/${pageId}`,
                {
                    params: {
                        fields: 'id,name,picture',
                        access_token: accessToken
                    }
                }
            )
            return response.data
        } catch (error: any) {
            console.error('Error getting page info:', error.response?.data || error.message)
            return null
        }
    }
}

export default new FacebookService()
