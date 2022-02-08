import { HasuraStorageApi } from "./hasura-storage-api";
import { base64Bytes, percentEncodedBytes, StringFormat, utf8Bytes } from "./utils";
import {
  StorageDeleteParams,
  StorageDeleteResponse,
  StorageGetPresignedUrlParams,
  StorageGetPresignedUrlResponse,
  StorageGetUrlParams,
  StorageMetadataResponse,
  StorageUploadFile,
  StorageUploadParams,
  StorageUploadResponse,
  StorageUploadString,
} from "./utils/types";

export class HasuraStorageClient {
  private url: string;
  private api: HasuraStorageApi;
  private appId: string | null;

  constructor({ url, appId = null }: { url: string; appId?: string | null }) {
    this.url = url;
    this.appId = appId;
    this.api = new HasuraStorageApi({ url, appId });
  }

  /**
   *
   * Use `.upload` to upload a file.
   *
   * @example
   *
   * storage.upload({ file })
   *
   */
  public async upload(
    params: StorageUploadParams
  ): Promise<StorageUploadResponse> {
    let file = new FormData();
    file.append("file", params.file);

    const { fileMetadata, error } = await this.api.upload({
      ...params,
      file,
    });
    if (error) {
      return { fileMetadata: null, error };
    }

    if (!fileMetadata) {
      return { fileMetadata: null, error: new Error("Invalid file returned") };
    }

    return { fileMetadata, error: null };
  }

  /**
   *
   * Use `.getUrl` to direct file URL to a file.
   *
   * @example
   *
   * storage.getUrl({ fileId: 'uuid' })
   *
   */
  public getUrl(params: StorageGetUrlParams): string {
    const { fileId } = params;
    return this.appId
      ? `/custom/storage/${this.appId}/o/${fileId}`
      : `${this.url}/files/${fileId}`;
  }

  /**
   *
   * Use `.getPresignedUrl` to get a presigned URL to a file.
   *
   * @example
   *
   * storage.getPresignedUrl({ fileId: 'uuid' })
   *
   *
   */
  public async getPresignedUrl(
    params: StorageGetPresignedUrlParams
  ): Promise<StorageGetPresignedUrlResponse> {
    const { presignedUrl, error } = await this.api.getPresignedUrl(params);
    if (error) {
      return { presignedUrl: null, error };
    }

    if (!presignedUrl) {
      return { presignedUrl: null, error: new Error("Invalid file id") };
    }

    return { presignedUrl, error: null };
  }

  /**
   *
   * Use `.delete` to delete a file.
   *
   * @example
   *
   * storage.delete({ fileId: 'uuid' })
   *
   *
   */
  public async delete(
    params: StorageDeleteParams
  ): Promise<StorageDeleteResponse> {
    const { error } = await this.api.delete(params);
    if (error) {
      return { error };
    }

    return { error: null };
  }

  public async uploadFileToStorage(
    params: StorageUploadFile
  ): Promise<StorageUploadResponse> {
    if (!params.path.startsWith("/")) {
      throw new Error("`path` must start with `/`");
    }
    let formData = new FormData();
    formData.append("file", params.file);
    const { fileMetadata, error } = await this.api.uploadFile({
      path: params.path,
      formData,
      onUploadProgress: params.onUploadProgress || undefined,
    });
    if (error) {
      return { fileMetadata: null, error };
    }

    if (!fileMetadata) {
      return { fileMetadata: null, error: new Error("Invalid file returned") };
    }

    return { fileMetadata, error: null };
  }

  public async uploadStringToStorage(
    params: StorageUploadString
  ): Promise<StorageUploadResponse> {
    if (!params.path.startsWith("/")) {
      throw new Error("`path` must start with `/`");
    }

    let fileData;
    let contentType: string | undefined;
    if (!params.type) params.type = "raw";
    if (params.type === "raw") {
      fileData = utf8Bytes(params.data);
      contentType =
        params.metadata && params.metadata.hasOwnProperty("content-type")
          ? params.metadata["content-type"]
          : undefined;
    } else if (params.type === "data_url") {
      let isBase64 = false;
      const matches = params.data.match(/^data:([^,]+)?,/);
      if (matches === null) {
        throw "Data must be formatted 'data:[<mediatype>][;base64],<data>";
      }
      const middle = matches[1] || null;
      if (middle != null) {
        isBase64 = middle.endsWith(";base64");
        contentType = isBase64
          ? middle.substring(0, middle.length - ";base64".length)
          : middle;
      }
      const restData = params.data.substring(params.data.indexOf(",") + 1);
      fileData = isBase64
        ? base64Bytes(StringFormat.BASE64, restData)
        : percentEncodedBytes(restData);
    }
    if (!fileData) {
      throw new Error("Unbale to generate file data");
    }

    const file = new File([fileData], "untitled", { type: contentType });
    // create form data
    let formData = new FormData();
    formData.append("file", file);

    const { fileMetadata, error } = await this.api.uploadFile({
      path: params.path,
      formData,
      onUploadProgress: params.onUploadProgress || undefined,
    });
    if (error) {
      return { fileMetadata: null, error };
    }

    if (!fileMetadata) {
      return { fileMetadata: null, error: new Error("Invalid file returned") };
    }

    return { fileMetadata, error: null };
  }

  public async deleteFile(path: string): Promise<StorageDeleteResponse> {
    if (!path.startsWith("/")) {
      return { error: new Error("`path` must start with `/`") };
    }
    const { error } = await this.api.deleteFile(path);
    if (error) {
      return { error };
    }

    return { error: null };
  }

  public async getS3Metadata(path: string): Promise<StorageMetadataResponse> {
    if (!path.startsWith("/")) {
      return { metadata: null, error: new Error("`path` must start with `/`") };
    }
    const { metadata, error } = await this.api.getMetadata(path);
    if (error) {
      return { metadata:null,  error };
    }

    return { metadata, error: null };
  }

  public setAccessToken(accessToken: string | undefined): void {
    this.api.setAccessToken(accessToken);
  }
}
