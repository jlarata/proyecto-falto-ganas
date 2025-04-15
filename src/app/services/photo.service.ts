import { Injectable } from '@angular/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';



@Injectable({
  providedIn: 'root'
})
export class PhotoService {

  public photos: UserPhoto[] = [];
  private PHOTO_STORAGE: string = 'photos';

  constructor() { }

  public async addNewToGallery() {
    //take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri, //file-based data; provides best performance
      source: CameraSource.Camera, // automatically take a new photo with the camera
      quality: 100 // highest
    });

    //save the picture and add it to photo collection
    const savedImageFile = await this.savePicture(capturedPhoto)
    this.photos.unshift(savedImageFile);
    Preferences.set({
      key: this.PHOTO_STORAGE,
      value: JSON.stringify(this.photos),
    });
  }

  public async loadSaved() {
    //retrieve cached photo array data
    const { value } = await Preferences.get({ key: this.PHOTO_STORAGE });
    this.photos = ( value ? JSON.parse(value) : []) as UserPhoto[];
    //display the photo by reading into base64 format
    for (let photo of this.photos) {
      //read each saved photo's data from the filesystem
      const readFile = await Filesystem.readFile({
        path: photo.filepath,
        directory: Directory.Data,
      });
      //web platform only: Load the photo as base64 data
      photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
    }
  }

  private async savePicture(photo: Photo) {
    // convert photo to base64 format, required by Filesystem API to save
    const base64Data = await this.readAsBase64(photo);
    //write the file to the data directory
    const fileName = Date.now() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });
    //use webPath to display the new image instad of base64 since it's already loaded into memory
    return {
      filepath: fileName,
      webviewPath: photo.webPath
    }
  }

  private async readAsBase64(photo: Photo) {
    //fetch the photo, read as a blob, then convert to base64 format
    const response = await fetch(photo.webPath!);
    const blob = await response.blob();
    return await this.convertBlobToBase64(blob) as string;
  }
  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  })
}

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}


