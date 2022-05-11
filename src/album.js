import { NativeModules, Platform } from "react-native";
import ImageAsset from "./image-asset";
import uuidGenerator from "./uuid-generator";
import { assetArrayObserverHandler } from "./change-observer-handler";
import EventEmitter from "../event-emitter";

const RNPFManager = NativeModules.RNPFManager;
if (!RNPFManager && Platform.OS === "ios") {
  throw new Error(
    "Could not find rn-photos-framework's native module. It seems it's not linked correctly in your xcode-project."
  );
}
const ImageAssetApi = new ImageAsset();

export default class Album extends EventEmitter {
  constructor(obj, fetchOptions, eventEmitter) {
    super();
    this._fetchOptions = fetchOptions;
    Object.assign(this, obj);
    if (this.previewAssets) {
      this.previewAssets = this.previewAssets.map(ImageAssetApi.createJsAsset);
      if (this.previewAssets.length) {
        this.previewAsset = this.previewAssets[0];
      }
    }

    eventEmitter.addListener("onObjectChange", (changeDetails) => {
      if (changeDetails._cacheKey === this._cacheKey) {
        this._emitChange(
          changeDetails,
          (assetArray, callback, fetchOptions) => {
            if (assetArray) {
              return assetArrayObserverHandler(
                changeDetails,
                assetArray,
                ImageAssetApi.createJsAsset,
                (indecies, callback) => {
                  //The update algo has requested new assets.
                  return this.newAssetsRequested(
                    indecies,
                    fetchOptions,
                    callback
                  );
                },
                this.perferedSortOrder
              ).then((updatedArray) => {
                callback && callback(updatedArray);
                return updatedArray;
              });
            }
            return assetArray;
          },
          this
        );
      }
    });
  }

  newAssetsRequested(indecies, fetchOptions, callback) {
    const fetchOptionsWithIndecies = {
      ...fetchOptions,
      indecies: [...indecies],
    };
    return this.getAssetsWithIndecies(fetchOptionsWithIndecies).then(
      (assets) => {
        callback && callback(assets);
        return assets;
      }
    );
  }

  deleteContentPermitted() {
    return this._canPerformOperation(0);
  }

  removeContentPermitted() {
    return this._canPerformOperation(1);
  }

  addContentPermitted() {
    return this._canPerformOperation(2);
  }

  createContentPermitted() {
    return this._canPerformOperation(3);
  }

  reArrangeContentPermitted() {
    return this._canPerformOperation(4);
  }

  deletePermitted() {
    return this._canPerformOperation(5);
  }

  renamePermitted() {
    return this._canPerformOperation(6);
  }

  _canPerformOperation(index) {
    return this.permittedOperations && this.permittedOperations[index];
  }

  stopTracking() {
    return new Promise((resolve, reject) => {
      if (this._cacheKey) {
        return resolve(RNPFManager.stopTracking(this._cacheKey));
      } else {
        resolve({
          success: true,
          status: "was-not-tracked",
        });
      }
    });
  }

  getAssets(params) {
    this.perferedSortOrder =
      params.assetDisplayBottomUp === params.assetDisplayStartToEnd
        ? "reversed"
        : "normal";
    const trackAssets =
      params.trackInsertsAndDeletes || params.trackAssetsChanges;
    if (trackAssets && !this._cacheKey) {
      this._cacheKey = uuidGenerator();
    }
    return this.getAssets({
      fetchOptions: this._fetchOptions,
      ...params,
      _cacheKey: this._cacheKey,
      albumLocalIdentifier: this.localIdentifier,
    });
  }

  getAssets(params) {
    if (
      params &&
      params.fetchOptions &&
      params.assetDisplayStartToEnd === undefined &&
      params.fetchOptions.sortDescriptors &&
      params.fetchOptions.sortDescriptors.length
    ) {
      params.assetDisplayStartToEnd = true;
    }
    return RNPFManager.getAssets(params).then((assetsResponse) => {
      return {
        assets: assetsResponse.assets.map(this.createJsAsset),
        includesLastAsset: assetsResponse.includesLastAsset,
      };
    });
  }

  getAssetsWithIndecies(params) {
    const trackAssets =
      params.trackInsertsAndDeletes || params.trackAssetsChanges;
    if (trackAssets && !this._cacheKey) {
      this._cacheKey = uuidGenerator();
    }
    return RNPFManager.getAssetsWithIndecies({
      fetchOptions: this._fetchOptions,
      ...params,
      _cacheKey: this._cacheKey,
      albumLocalIdentifier: this.localIdentifier,
    }).then((assetsResponse) => {
      return assetsResponse.assets.map(this.createJsAsset);
    });
  }

  addAsset(asset) {
    return this.addAssets([asset]);
  }

  addAssets(assets) {
    return RNPFManager.addAssetsToAlbum({
      assets: assets.map((asset) => asset.localIdentifier),
      _cacheKey: this._cacheKey,
      albumLocalIdentifier: this.localIdentifier,
    });
  }

  removeAsset(asset) {
    return this.removeAssets([asset]);
  }

  removeAssets(assets) {
    return RNPFManager.removeAssetsFromAlbum({
      assets: assets.map((asset) => asset.localIdentifier),
      _cacheKey: this._cacheKey,
      albumLocalIdentifier: this.localIdentifier,
    });
  }

  updateTitle(newTitle) {
    return RNPFManager.updateAlbumTitle({
      newTitle: newTitle,
      _cacheKey: this._cacheKey,
      albumLocalIdentifier: this.localIdentifier,
    });
  }

  delete() {
    return RNPFManager.deleteAlbums([this.localIdentifier]);
  }

  onChange(cb) {
    const listener = this.addListener("onChange", cb);
    return () => listener?.remove?.();
  }

  _emitChange(...args) {
    this.emit("onChange", ...args);
  }
}
