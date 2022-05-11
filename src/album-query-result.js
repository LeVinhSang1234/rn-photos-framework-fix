import Album from "./album";
import AlbumQueryResultBase from "./album-query-result-base";
import { collectionArrayObserverHandler } from "./change-observer-handler";
import { NativeModules, Platform } from "react-native";

const RNPFManager = NativeModules.RNPFManager;
if (!RNPFManager && Platform.OS === "ios") {
  throw new Error(
    "Could not find rn-photos-framework's native module. It seems it's not linked correctly in your xcode-project."
  );
}

export default class AlbumQueryResult extends AlbumQueryResultBase {
  constructor(obj, fetchParams, eventEmitter) {
    super();
    this.eventEmitter = eventEmitter;
    this._fetchParams = fetchParams || {};
    Object.assign(this, obj);
    this._albumNativeObjs = this.albums;
    this.albums = this._albumNativeObjs.map(
      (albumObj) =>
        new Album(albumObj, this._fetchParams.assetFetchOptions, eventEmitter)
    );
    eventEmitter.addListener("onObjectChange", (changeDetails) => {
      if (this._cacheKey === changeDetails._cacheKey) {
        this.emit(
          "onChange",
          changeDetails,
          (callback) => {
            this.applyChangeDetails(changeDetails, callback);
          },
          this
        );
      }
    });
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

  applyChangeDetails(changeDetails, callback) {
    return collectionArrayObserverHandler(
      changeDetails,
      this.albums,
      (nativeObj) => {
        return new Album(
          nativeObj,
          this._fetchParams.fetchOptions,
          this.eventEmitter
        );
      }
    ).then((albums) => {
      this.albums = albums;
      callback && callback(this);
    });
  }
}
