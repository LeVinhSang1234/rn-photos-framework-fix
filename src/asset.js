import { NativeModules, Platform, NativeEventEmitter } from "react-native";
import uuidGenerator from "./uuid-generator";

const RNPFManager = NativeModules.RNPFManager;
if (!RNPFManager && Platform.OS === "ios") {
  throw new Error(
    "Could not find rn-photos-framework's native module. It seems it's not linked correctly in your xcode-project."
  );
}
export default class Asset {
  static scheme = "photos://";
  constructor(assetObj) {
    Object.assign(this, assetObj);
    this._assetObj = assetObj;
    this.nativeEventEmitter = new NativeEventEmitter(NativeModules.RNPFManager);
  }

  get uri() {
    if (this.lastOptions === this.currentOptions && this._uri) {
      return this._uri;
    }
    let queryString;
    if (this.currentOptions) {
      this.lastOptions = this.currentOptions;
      queryString = this.serialize(this.currentOptions);
    }
    this._uri = Asset.scheme + this.localIdentifier;
    if (queryString) {
      this._uri = this._uri + `?${queryString}`;
    }
    return this._uri;
  }

  //This is here in base-class, videos can display thumb.
  get image() {
    if (this._imageRef) {
      return this._imageRef;
    }
    const { width, height, uri } = this;
    this._imageRef = {
      width,
      height,
      uri,
      name: "test.jpg",
    };
    return this._imageRef;
  }

  get creationDate() {
    return this.toJsDate("creationDateUTCSeconds", "_creationDate");
  }

  get modificationDate() {
    return this.toJsDate("modificationDateUTCSeconds", "_modificationDate");
  }

  toJsDate(UTCProperty, cachedProperty) {
    if (!this[UTCProperty]) {
      return undefined;
    }
    if (!this[cachedProperty]) {
      const utcSecondsCreated = this[UTCProperty];
      this[cachedProperty] = new Date(0);
      this[cachedProperty].setUTCSeconds(utcSecondsCreated);
    }
    return this[cachedProperty];
  }

  getMetadata() {
    return this._fetchExtraData("getAssetsMetadata", "creationDate");
  }

  refreshMetadata() {
    return this._fetchExtraData("getAssetsMetadata", "creationDate", true);
  }

  getResourcesMetadata() {
    return this._fetchExtraData(
      "getAssetsResourcesMetadata",
      "resourcesMetadata"
    );
  }

  getAssetsResourcesMetadata(assetsLocalIdentifiers) {
    return RNPFManager.getAssetsResourcesMetadata(assetsLocalIdentifiers);
  }

  getAssetsMetadata(assetsLocalIdentifiers) {
    return RNPFManager.getAssetsMetadata(assetsLocalIdentifiers);
  }

  _fetchExtraData(nativeMethod, alreadyLoadedProperty, force) {
    return new Promise((resolve, reject) => {
      if (!force && this[alreadyLoadedProperty]) {
        resolve(this);
        return;
      }
      return resolve(
        this[nativeMethod]([this.localIdentifier]).then((metadataObjs) => {
          if (metadataObjs && metadataObjs[this.localIdentifier]) {
            Object.assign(this, metadataObjs[this.localIdentifier]);
          }
          return this;
        })
      );
    });
  }

  serialize(obj) {
    var str = [];
    for (var p in obj) {
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    }
    return str.join("&");
  }

  withOptions(options) {
    this.currentOptions = options;
    return this;
  }

  delete() {
    return RNPFManager.deleteAssets([this.localIdentifier]);
  }

  setHidden(hidden) {
    return this._updateProperty("hidden", hidden, true);
  }

  setFavorite(favorite) {
    return this._updateProperty("favorite", favorite, true);
  }

  setCreationDate(jsDate) {
    return this._updateProperty("creationDate", jsDate, false);
  }

  setLocation(latLngObj) {
    return this._updateProperty("location", latLngObj, false);
  }

  updateAssetsWithResoucesMetadata(assets) {
    return new Promise((resolve, reject) => {
      const assetsWithoutRoesourceMetaData = assets.filter(
        (asset) => asset.resourcesMetadata === undefined
      );
      if (assetsWithoutRoesourceMetaData.length) {
        RNPFManager.getAssetsResourcesMetadata(
          assetsWithoutRoesourceMetaData.map((asset) => asset.localIdentifier)
        ).then((result) => {
          assetsWithoutRoesourceMetaData.forEach((asset) => {
            Object.assign(asset, result[asset.localIdentifier]);
          });
          resolve(assets);
        });
      } else {
        resolve(assets);
      }
    });
  }

  //name and extension are optional
  saveAssetToDisk(options, onProgress, generateFileName) {
    const { args } = this.withUniqueEventListener(
      "onSaveAssetsToFileProgress",
      {},
      onProgress
    );

    const assetsWithOptions = [{ asset: this, options: { onProgress } }];
    return this.updateAssetsWithResoucesMetadata(
      assetsWithOptions.map((assetWithOption) => assetWithOption.asset)
    ).then(() => {
      return RNPFManager.saveAssetsToDisk({
        media: assetsWithOptions.map((assetWithOption) => {
          const { asset } = assetWithOption;
          const resourceMetadata = assetWithOption.asset.resourcesMetadata[0];
          const fileName =
            generateFileName !== undefined
              ? generateFileName(assetWithOption.asset, resourceMetadata)
              : resourceMetadata.originalFilename;
          return {
            fileName,
            ...resourceMetadata,
            uri: asset.uri,
            localIdentifier: asset.localIdentifier,
            mediaType: asset.mediaType,
            ...assetWithOption.options,
          };
        }),
        events: {
          onSaveAssetsToFileProgress: args.onSaveAssetsToFileProgress,
        },
      });
    });
  }

  withUniqueEventListener(eventName, params, cb) {
    let subscription;
    if (cb) {
      params[eventName] = uuidGenerator();
      subscription = this.nativeEventEmitter.addListener(eventName, (data) => {
        if (cb && data.id && data.id === params[eventName]) {
          cb(data);
        }
      });
    }
    return {
      args: params,
      unsubscribe: subscription,
    };
  }

  _updateProperty(property, value, precheckValue) {
    return new Promise((resolve) => {
      if (precheckValue && this[property] === value) {
        return resolve({
          success: true,
          error: "",
        });
      }
      const assetUpdateObjs = {
        [this.localIdentifier]: { [property]: value },
      };
      const arrayWithLocalIdentifiers = Object.keys(assetUpdateObjs);
      return RNPFManager.updateAssets(
        arrayWithLocalIdentifiers,
        assetUpdateObjs
      ).then((result) => {
        return result;
      });
    });
  }
}
