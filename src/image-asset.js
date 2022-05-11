import Asset from "./asset";
import VideoAsset from "./video-asset";

export default class ImageAsset extends Asset {
  constructor(assetObj, options) {
    super(assetObj, options);
  }

  getImageMetadata() {
    return this._fetchExtraData("getImageAssetsMetadata", "imageMetadata");
  }

  createJsAsset(nativeObj, options) {
    switch (nativeObj.mediaType) {
      case "image":
        return new ImageAsset(nativeObj, options);
      case "video":
        return new VideoAsset(nativeObj, options);
    }
  }
}
