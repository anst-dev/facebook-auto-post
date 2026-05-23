const axios = require('axios');

const GRAPH_API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

class FacebookAPI {
  constructor(pageId, accessToken) {
    this.pageId = pageId;
    this.accessToken = accessToken;
  }

  _url(path) {
    return `${BASE_URL}${path}`;
  }

  async verifyToken() {
    try {
      const res = await axios.get(this._url('/me'), {
        params: { access_token: this.accessToken, fields: 'id,name' }
      });
      return { valid: true, data: res.data };
    } catch (err) {
      return { valid: false, error: err.response?.data || err.message };
    }
  }

  async getPageInfo() {
    try {
      const res = await axios.get(this._url(`/${this.pageId}`), {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,fan_count,about,website'
        }
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async getManagedPages() {
    try {
      const res = await axios.get(this._url('/me/accounts'), {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,access_token'
        }
      });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async postMessage(message) {
    try {
      const res = await axios.post(this._url(`/${this.pageId}/feed`), {
        message,
        access_token: this.accessToken
      });
      return { success: true, postId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async postLink(link, message) {
    try {
      const res = await axios.post(this._url(`/${this.pageId}/feed`), {
        link,
        message,
        access_token: this.accessToken
      });
      return { success: true, postId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async postPhoto(imageUrl, message) {
    try {
      const res = await axios.post(this._url(`/${this.pageId}/photos`), {
        url: imageUrl,
        message,
        access_token: this.accessToken
      });
      return { success: true, postId: res.data.id, photoId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async postMultiPhotos(imageUrls, message) {
    try {
      const photoIds = [];
      for (const url of imageUrls) {
        const res = await axios.post(this._url(`/${this.pageId}/photos`), {
          url,
          published: false,
          access_token: this.accessToken
        });
        photoIds.push(res.data.id);
      }

      const attachedMedia = photoIds.map(id => ({ media_fbid: id }));
      const res = await axios.post(this._url(`/${this.pageId}/feed`), {
        message,
        attached_media: JSON.stringify(attachedMedia),
        access_token: this.accessToken
      });
      return { success: true, postId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async schedulePost(message, scheduledTimestamp) {
    try {
      const res = await axios.post(this._url(`/${this.pageId}/feed`), {
        message,
        published: false,
        scheduled_publish_time: scheduledTimestamp,
        access_token: this.accessToken
      });
      return { success: true, postId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async getPost(postId) {
    try {
      const res = await axios.get(this._url(`/${postId}`), {
        params: {
          access_token: this.accessToken,
          fields: 'id,message,created_time,permalink_url,full_picture,shares,likes.summary(true)'
        }
      });
      return { success: true, data: res.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async getFeed(limit = 10) {
    try {
      const res = await axios.get(this._url(`/${this.pageId}/feed`), {
        params: {
          access_token: this.accessToken,
          fields: 'id,message,created_time,permalink_url',
          limit
        }
      });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async deletePost(postId) {
    try {
      const res = await axios.delete(this._url(`/${postId}`), {
        params: { access_token: this.accessToken }
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async getPostInsights(postId) {
    try {
      const res = await axios.get(this._url(`/${postId}/insights`), {
        params: {
          access_token: this.accessToken,
          metric: 'post_impressions,post_engaged_users,post_clicks'
        }
      });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async getPermissions() {
    try {
      const res = await axios.get(this._url('/me/permissions'), {
        params: { access_token: this.accessToken }
      });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  // === GROUP FUNCTIONS ===

  async getGroups() {
    try {
      const res = await axios.get(this._url('/me/groups'), {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,privacy,member_count'
        }
      });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async postToGroup(groupId, message) {
    try {
      const res = await axios.post(this._url(`/${groupId}/feed`), {
        message,
        access_token: this.accessToken
      });
      return { success: true, postId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async postLinkToGroup(groupId, link, message) {
    try {
      const res = await axios.post(this._url(`/${groupId}/feed`), {
        link,
        message,
        access_token: this.accessToken
      });
      return { success: true, postId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async postPhotoToGroup(groupId, imageUrl, message) {
    try {
      const res = await axios.post(this._url(`/${groupId}/photos`), {
        url: imageUrl,
        message,
        access_token: this.accessToken
      });
      return { success: true, postId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async getGroupFeed(groupId, limit = 10) {
    try {
      const res = await axios.get(this._url(`/${groupId}/feed`), {
        params: {
          access_token: this.accessToken,
          fields: 'id,message,created_time,from',
          limit
        }
      });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  // === COMMENT & MESSAGING FUNCTIONS ===

  async getPublishedPosts(limit = 10) {
    try {
      const res = await axios.get(this._url(`/${this.pageId}/published_posts`), {
        params: {
          access_token: this.accessToken,
          fields: 'id,message,created_time',
          limit
        }
      });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async getComments(postId, options = {}) {
    try {
      const params = {
        access_token: this.accessToken,
        fields: 'id,message,from,created_time',
        order: 'reverse_chronological',
        limit: options.limit || 50
      };
      if (options.since) {
        params.since = options.since;
      }
      const res = await axios.get(this._url(`/${postId}/comments`), { params });
      return { success: true, data: res.data.data };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async replyToComment(commentId, message, attachmentUrl = null) {
    try {
      const body = {
        message,
        access_token: this.accessToken
      };
      if (attachmentUrl) {
        body.attachment_url = attachmentUrl;
      }
      const res = await axios.post(this._url(`/${commentId}/comments`), body);
      return { success: true, commentId: res.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async sendPrivateMessage(psid, message) {
    try {
      const res = await axios.post(this._url(`/${this.pageId}/messages`), {
        recipient: { id: psid },
        message: { text: message },
        access_token: this.accessToken
      });
      return { success: true, messageId: res.data.message_id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }

  async sendPrivateReply(commentId, message) {
    try {
      const res = await axios.post(this._url(`/${this.pageId}/messages`), {
        recipient: { comment_id: commentId },
        message: { text: message },
        access_token: this.accessToken
      });
      return { success: true, messageId: res.data.message_id };
    } catch (err) {
      return { success: false, error: err.response?.data || err.message };
    }
  }
}

module.exports = FacebookAPI;
