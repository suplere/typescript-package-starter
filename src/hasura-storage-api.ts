import axios, { AxiosInstance } from "axios";
import {
  ApiDeleteParams,
  ApiDeleteResponse,
  ApiGetPresignedUrlParams,
  ApiGetPresignedUrlResponse,
  ApiUploadParams,
  ApiUploadResponse,
  StorageMetadataResponse,
  UploadHeaders,
} from "./utils/types";

export class HasuraStorageApi {
  private url: string;
  private httpClient: AxiosInstance;
  private accessToken: string | undefined;
  private appId: string | null;

  constructor({ url, appId }: { url: string; appId: string | null }) {
    this.url = url;
    this.appId = appId;

    this.httpClient = axios.create({
      baseURL: this.appId
        ? `${this.url}/custom/storage/${this.appId}`
        : this.url,
      timeout: 10000,
    });
  }

  public async upload(params: ApiUploadParams): Promise<ApiUploadResponse> {
    try {
      const res = await this.httpClient.post("/files", params.file, {
        headers: {
          ...this.generateUploadHeaders(params),
          ...this.generateAuthHeaders(),
        },
      });

      return { fileMetadata: res.data, error: null };
    } catch (error) {
      return { fileMetadata: null, error: error as Error };
    }
  }

  public async getPresignedUrl(
    params: ApiGetPresignedUrlParams
  ): Promise<ApiGetPresignedUrlResponse> {
    try {
      const { fileId } = params;
      const res = await this.httpClient.get(`/files/${fileId}/presignedurl`, {
        headers: {
          ...this.generateAuthHeaders(),
        },
      });
      return { presignedUrl: res.data, error: null };
    } catch (error) {
      return { presignedUrl: null, error: error as Error };
    }
  }

  public async delete(params: ApiDeleteParams): Promise<ApiDeleteResponse> {
    try {
      const { fileId } = params;
      await this.httpClient.delete(`/files/${fileId}`, {
        headers: {
          ...this.generateAuthHeaders(),
        },
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  public setAccessToken(accessToken: string | undefined) {
    this.accessToken = accessToken;
  }

  private generateUploadHeaders(params: ApiUploadParams): UploadHeaders {
    const { bucketId, name, id } = params;
    let uploadheaders: UploadHeaders = {};

    if (bucketId) {
      uploadheaders["x-nhost-bucket-id"] = bucketId;
    }
    if (id) {
      uploadheaders["x-nhost-file-id"] = id;
    }
    if (name) {
      uploadheaders["x-nhost-file-name"] = name;
    }
    return uploadheaders;
  }

  private generateAuthHeaders() {
    if (!this.accessToken) {
      return null;
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  public async uploadFile({
    path,
    formData,
    onUploadProgress = undefined,
  }: {
    path: string;
    formData: FormData;
    onUploadProgress: any | undefined;
  }): Promise<ApiUploadResponse> {
    try {
      const res = await this.httpClient.post(`/o${path}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...this.generateAuthHeaders(),
        },
        onUploadProgress,
      });
      return { fileMetadata: res.data, error: null };
    } catch (error) {
      return { fileMetadata: null, error: error as Error };
    }
  }

  async deleteFile(path: string): Promise<ApiDeleteResponse> {
    try {
      await this.httpClient.delete(`/o${path}`, {
        headers: {
          ...this.generateAuthHeaders(),
        },
      });
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async getMetadata(path: string): Promise<StorageMetadataResponse> {
    const res = await this.httpClient.get(`/m${path}`, {
      headers: {
        ...this.generateAuthHeaders(),
      },
    });
    return res.data;
  }
}
