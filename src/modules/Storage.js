import { ButtonSet } from '../class/ButtonSet';
import { Popup } from '../class/Popup';
import { shared } from '../class/Shared';
import { ToggleSwitch } from '../class/ToggleSwitch';
import { utils } from '../lib/jsUtils';
import { settingsModule } from './Settings';
import { Checkbox } from '../class/Checkbox';
import { elementBuilder } from '../lib/SgStUtils/ElementBuilder';
import { gSettings } from '../class/Globals';
import { permissions } from '../class/Permissions';

const
  sortArray = utils.sortArray.bind(utils)
;

function getDataMenu(option, switches, type) {
  let i, m, menu, n, options, toggleSwitch;
  menu = document.createElement(`div`);
  switches[option.key] = toggleSwitch = new ToggleSwitch(menu, `${type}_${option.key}`, false, option.name, false, false, null, gSettings[`${type}_${option.key}`]);
  switches[option.key].size = shared.common.createElements(switches[option.key].name, `beforeEnd`, [{
    attributes: {
      class: `esgst-bold`
    },
    type: `span`
  }]);
  if (option.name === `Main`) {
    shared.common.createElements(switches[option.key].name, `beforeEnd`, [{
      attributes: {
        class: `fa fa-question-circle`,
        title: `Main data is the data that is needed by other sub-options. Because of that dependency, when deleting main data not all data may be deleted, but if you delete another sub-option first and then delete main data, all data that was required exclusively by that sub-option will be deleted.`
      },
      type: `i`
    }]);
  }
  if (option.options) {
    options = shared.common.createElements(menu, `beforeEnd`, [{
      attributes: {
        class: `esgst-form-row-indent SMFeatures esgst-hidden`
      },
      type: `div`
    }]);
    const optionSwitches = {};
    if (option.options.length > 1) {
      const group = shared.common.createElements(options, `beforeEnd`, [{
        attributes: {
          class: `esgst-button-group`
        },
        type: `div`,
        children: [{
          text: `Select:`,
          type: `span`
        }]
      }]);
      group.appendChild(new ButtonSet({
        color1: `grey`,
        color2: `grey`,
        icon1: `fa-square`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `All`,
        title2: ``,
        callback1: shared.common.selectSwitches.bind(shared.common, optionSwitches, `enable`, group)
      }).set);
      group.appendChild(new ButtonSet({
        color1: `grey`,
        color2: `grey`,
        icon1: `fa-square-o`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `None`,
        title2: ``,
        callback1: shared.common.selectSwitches.bind(shared.common, optionSwitches, `disable`, group)
      }).set);
      group.appendChild(new ButtonSet({
        color1: `grey`,
        color2: `grey`,
        icon1: `fa-plus-square-o`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `Inverse`,
        title2: ``,
        callback1: shared.common.selectSwitches.bind(shared.common, optionSwitches, `toggle`, group)
      }).set);
    }
    for (i = 0, n = option.options.length; i < n; ++i) {
      m = getDataMenu(option.options[i], switches, type);
      optionSwitches[option.options[i].key] = switches[option.options[i].key];
      options.appendChild(m);
      toggleSwitch.dependencies.push(m);
    }
    if (gSettings[`${type}_${option.key}`]) {
      options.classList.remove(`esgst-hidden`);
    }
  }
  toggleSwitch.onEnabled = () => {
    if (options) {
      options.classList.remove(`esgst-hidden`);
    }
  };
  toggleSwitch.onDisabled = () => {
    if (options) {
      options.classList.add(`esgst-hidden`);
    }
  };
  return menu;
}

function getDataSizes(dm) {
  let spacePopup = new Popup({
    addScrollable: true,
    icon: `fa-circle-o-notch fa-spin`,
    title: `Calculating data sizes...`
  });
  spacePopup.open(manageData.bind(null, dm, false, false, false, spacePopup));
}

async function loadImportFile(dm, dropbox, googleDrive, oneDrive, space, callback) {
  let file;
  if (dropbox) {
    await shared.common.delValue(`dropboxToken`);
    shared.common.openSmallWindow(`https://www.dropbox.com/oauth2/authorize?redirect_uri=https://www.steamgifts.com/account/settings/profile&response_type=token&state=dropbox&client_id=nix7kvchwa8wdvj`);
    // noinspection JSIgnoredPromiseFromCall
    checkDropboxComplete(null, dm, callback);
  } else if (googleDrive) {
    await shared.common.delValue(`googleDriveToken`);
    shared.common.openSmallWindow(`https://accounts.google.com/o/oauth2/v2/auth?${gSettings.usePreferredGoogle ? `login_hint=${gSettings.preferredGoogle}&` : ``}redirect_uri=https://www.steamgifts.com/account/settings/profile&response_type=token&state=google-drive&client_id=102804278399-95kit5e09mdskdta7eq97ra7tuj20qps.apps.googleusercontent.com&scope=https://www.googleapis.com/auth/drive.appdata`);
    // noinspection JSIgnoredPromiseFromCall
    checkGoogleDriveComplete(null, dm, callback);
  } else if (oneDrive) {
    await shared.common.delValue(`oneDriveToken`);
    shared.common.openSmallWindow(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${gSettings.usePreferredMicrosoft ? `login_hint=${gSettings.preferredMicrosoft}&` : ``}redirect_uri=https://www.steamgifts.com/account/settings/profile&response_type=token&state=onedrive&client_id=1781429b-289b-4e6e-877a-e50015c0af21&scope=files.readwrite`);
    // noinspection JSIgnoredPromiseFromCall
    checkOneDriveComplete(null, dm, callback);
  } else {
    file = dm.input.files[0];
    if (file) {
      dm.reader = new FileReader();
      const isZip = file.name.match(/\.zip$/);
      dm.reader.onload = readImportFile.bind(null, dm, dropbox, googleDrive, oneDrive, space, isZip, callback);
      if (isZip) {
        dm.reader.readAsBinaryString(file);
      } else {
        dm.reader.readAsText(file);
      }
    } else {
      shared.common.createFadeMessage(dm.warning, `No file was loaded!`);
      callback();
    }
  }
}

async function readImportFile(dm, dropbox, googleDrive, oneDrive, space, isZip, callback) {
  try {
    if (dm.reader) {
      dm.data = JSON.parse(isZip
        ? (await shared.common.readZip(dm.reader.result))[0].value
        : dm.reader.result
      );
    }
    shared.common.createConfirmation(`Are you sure you want to restore the selected data?`, manageData.bind(null, dm, dropbox, googleDrive, oneDrive, space, callback), callback);
  } catch (error) {
    shared.common.createFadeMessage(dm.warning, `Cannot parse file!`);
    callback();
  }
}

function confirmDataDeletion(dm, dropbox, googleDrive, oneDrive, space, callback) {
  shared.common.createConfirmation(`Are you sure you want to delete the selected data?`, manageData.bind(null, dm, dropbox, googleDrive, oneDrive, space, callback), callback);
}

async function checkDropboxComplete(data, dm, callback) {
  let value = shared.common.getValue(`dropboxToken`);
  if (value) {
    if (dm.type === `export` || (data && gSettings.exportBackup)) {
      const name = gSettings.askFileName ? window.prompt(`Enter the name of the file:`, `esgst_data_${new Date().toISOString().replace(/:/g, `_`)}`) : `esgst_data_${new Date().toISOString().replace(/:/g, `_`)}`;
      if (name === null) {
        callback();
        return;
      }
      let responseText = ``;
      try {
        const response = await shared.common.request({
          data: JSON.stringify(data),
          fileName: gSettings.backupZip ? `${name}.json` : null,
          headers: {
            authorization: `Bearer ${value}`,
            [`Dropbox-API-Arg`]: gSettings.backupZip ? `{"path": "/${name}.zip"}` : `{"path": "/${name}.json"}`,
            [`Content-Type`]: `application/octet-stream`
          },
          method: `POST`,
          url: `https://content.dropboxapi.com/2/files/upload`
        });
        responseText = response.responseText;
        const responseJson = JSON.parse(responseText);
        if (!responseJson.id) {
          // noinspection ExceptionCaughtLocallyJS
          throw ``;
        }
        if (!dm.autoBackup) {
          shared.common.createFadeMessage(dm.message, `Data ${dm.pastTense} with success!`);
        }
        callback();
      } catch (e) {
        callback();
        window.alert(`An error occurred when uploading the file.\n\n${e}\n\n${responseText}`);
      }
    } else {
      let canceled = true;
      let popup = new Popup({
        addScrollable: true,
        icon: `fa-dropbox`,
        isTemp: true,
        title: `Select a file to restore:`
      });
      popup.onClose = () => {
        if (canceled) {
          callback();
        }
      };
      popup.open();
      let selectedFiles = {};
      let entries = shared.common.createElements(popup.scrollable, `beforeEnd`, [{
        attributes: {
          class: `popup__keys__list`
        },
        type: `div`
      }]);
      popup.popup.insertBefore(new ButtonSet({
        color1: `green`,
        color2: `grey`,
        icon1: `fa-trash`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `Delete selected files`,
        title2: `Deleting...`,
        callback1: () => {
          return new Promise(resolve => {
            if (!Object.keys(selectedFiles).length) {
              resolve();
              return;
            }
            shared.common.createConfirmation(`WARNING: Are you sure you want to delete the selected files?`, async () => {
              let result = JSON.parse((await shared.common.request({
                data: JSON.stringify({
                  entries: Object.keys(selectedFiles).map(x => ({
                    path: `/${x}`
                  }))
                }),
                headers: {
                  authorization: `Bearer ${value}`,
                  [`Content-Type`]: `application/json`
                },
                method: `POST`,
                url: `https://api.dropboxapi.com/2/files/delete_batch`
              })).responseText);
              if (result[`.tag`] !== `complete`) {
                result = await checkDropboxBatchComplete(result.async_job_id, value);
              }
              let failed = 0;
              for (const entry of result.entries) {
                if (entry[`.tag`] === `success`) {
                  selectedFiles[entry.metadata.name].item.remove();
                } else {
                  failed += 1;
                }
              }
              selectedFiles = {};
              let icon, title;
              if (failed > 0) {
                icon = `fa-times`;
                title = `An error happened while deleting ${failed} of the files.`;
              } else {
                icon = `fa-check`;
                title = `Files deleted with success.`;
              }         
              const tempPopup = new Popup({ icon, title, isTemp: true });
              tempPopup.open();
              resolve();
            }, resolve)
          });
        }
      }).set, popup.actions);
      JSON.parse((await shared.common.request({
        data: `{"path": ""}`,
        headers: {
          authorization: `Bearer ${value}`,
          [`Content-Type`]: `application/json`
        },
        method: `POST`,
        url: `https://api.dropboxapi.com/2/files/list_folder`
      })).responseText).entries.reverse().forEach(entry => {
        const item = shared.common.createElements_v2(entries, `beforeEnd`, [
          [`div`, { class: `esgst-clickable esgst-restore-entry` }, [
            [`span`],
            [`span`, `${entry.name} - ${shared.common.convertBytes(entry.size)}`],
            [`i`, { class: `fa fa-times-circle`, title: `Delete file` }]
          ]]
        ]);
        const checkbox = new Checkbox(item.firstElementChild);
        checkbox.onEnabled = () => selectedFiles[entry.name] = { item };
        checkbox.onDisabled = () => delete selectedFiles[entry.name];
        item.firstElementChild.nextElementSibling.addEventListener(`click`, () => {
          shared.common.createConfirmation(`Are you sure you want to restore the selected data?`, async () => {
            canceled = false;
            popup.close();
            dm.data = JSON.parse((await shared.common.request({
              blob: entry.name.match(/\.zip$/),
              headers: {
                authorization: `Bearer ${value}`,
                [`Dropbox-API-Arg`]: `{"path": "/${entry.name}"}`,
                [`Content-Type`]: `text/plain`
              },
              method: `GET`,
              url: `https://content.dropboxapi.com/2/files/download`
            })).responseText);
            // noinspection JSIgnoredPromiseFromCall
            manageData(dm, false, false, false, false, callback);
          });
        });
        item.lastElementChild.addEventListener(`click`, () => {
          shared.common.createConfirmation(`WARNING: Are you sure you want to delete this file?`, async () => {
            const tempPopup = new Popup({ icon: `fa-circle-o-notch fa-spin`, title: `Deleting file...`, isTemp: true });
            tempPopup.open();
            const result = JSON.parse((await shared.common.request({
              data: JSON.stringify({
                path: `/${entry.name}`
              }),
              headers: {
                authorization: `Bearer ${value}`,
                [`Content-Type`]: `application/json`
              },
              method: `POST`,
              url: `https://api.dropboxapi.com/2/files/delete_v2`
            })).responseText);
            if (result.error) {
              tempPopup.setIcon(`fa-times`);
              tempPopup.setTitle(`An error happened while deleting the file.`);
            } else {
              item.remove();
              tempPopup.setIcon(`fa-check`);
              tempPopup.setTitle(`File deleted with success.`);
            }
          });
        });
      });
    }
  } else {
    window.setTimeout(() => checkDropboxComplete(data, dm, callback), 250);
  }
}

function checkDropboxBatchComplete(id, value) {
  return new Promise(resolve => {
    checkDropboxBatchComplete_1(id, value, resolve);
  });
}

async function checkDropboxBatchComplete_1(id, value, resolve) {  
  const result = JSON.parse((await shared.common.request({
    data: JSON.stringify({
      async_job_id: id
    }),
    headers: {
      authorization: `Bearer ${value}`,
      [`Content-Type`]: `application/json`
    },
    method: `POST`,
    url: `https://api.dropboxapi.com/2/files/delete_batch/check`
  })).responseText);
  if (result[`.tag`] === `complete`) {
    resolve(result);
  } else {
    window.setTimeout(checkDropboxBatchComplete_1, 1000, id, value, resolve);
  }
}

async function checkGoogleDriveComplete(data, dm, callback) {
  let value = shared.common.getValue(`googleDriveToken`);
  if (value) {
    if (dm.type === `export` || (data && gSettings.exportBackup)) {
      const name = gSettings.askFileName ? window.prompt(`Enter the name of the file:`, `esgst_data_${new Date().toISOString().replace(/:/g, `_`)}`) : `esgst_data_${new Date().toISOString().replace(/:/g, `_`)}`;
      if (name === null) {
        callback();
        return;
      }
      let responseText = ``;
      try {
        const resourceResponse = await shared.common.request({
          data: gSettings.backupZip ? `{"name": "${name}.zip", "parents": ["appDataFolder"]}` : `{"name": "${name}.json", "parents": ["appDataFolder"]}`,
          headers: {
            authorization: `Bearer ${value}`,
            [`Content-Type`]: `application/json`
          },
          method: `POST`,
          url: `https://www.googleapis.com/drive/v3/files`
        });
        const response = await shared.common.request({
          data: JSON.stringify(data),
          fileName: gSettings.backupZip ? `${name}.json` : null,
          headers: {
            authorization: `Bearer ${value}`,
            [`Content-Type`]: gSettings.backupZip ? `application/zip` : `text/plain`
          },
          method: `PATCH`,
          url: `https://www.googleapis.com/upload/drive/v3/files/${JSON.parse(resourceResponse.responseText).id}?uploadType=media`
        });
        responseText = response.responseText;
        const responseJson = JSON.parse(responseText);
        if (!responseJson.id) {
          // noinspection ExceptionCaughtLocallyJS
          throw ``;
        }
        if (!dm.autoBackup) {
          shared.common.createFadeMessage(dm.message, `Data ${dm.pastTense} with success!`);
        }
        callback();
      } catch (e) {
        callback();
        window.alert(`An error occurred when uploading the file.\n\n${e}\n\n${responseText}`);
      }
    } else {
      let canceled = true;
      let popup = new Popup({
        addScrollable: true,
        icon: `fa-google`,
        isTemp: true,
        title: `Select a file to restore:`
      });
      popup.onClose = () => {
        if (canceled) {
          callback();
        }
      };
      popup.open();
      let selectedFiles = {};
      let entries = shared.common.createElements(popup.scrollable, `beforeEnd`, [{
        attributes: {
          class: `popup__keys__list`
        },
        type: `div`
      }]);
      popup.popup.insertBefore(new ButtonSet({
        color1: `green`,
        color2: `grey`,
        icon1: `fa-trash`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `Delete selected files`,
        title2: `Deleting...`,
        callback1: () => {
          return new Promise(resolve => {
            if (!Object.keys(selectedFiles).length) {
              resolve();
              return;
            }
            shared.common.createConfirmation(`WARNING: Are you sure you want to delete the selected files?`, async () => {
              const chunks = [];
              const keys = Object.keys(selectedFiles);
              for (let i = 0; keys[i]; ) {
                const chunk = keys.slice(i, i + 100);
                chunks.push(chunk);
                i += chunk.length;
              }
              let failed = 0;
              for (const chunk of chunks) {
                const formData = [];
                for (const key of chunk) {
                  formData.push(
                    `--ESGST`,
                    `Content-Type: application/http`,
                    ``,
                    `DELETE https://www.googleapis.com/drive/v3/files/${key}`,
                    ``,
                    ``
                  );
                }
                formData.push(`--ESGST--`);
                const result = (await shared.common.request({
                  isFormData: true,
                  data: formData.join(`\n`),
                  headers: {
                    authorization: `Bearer ${value}`,
                    'Content-Type': `multipart/mixed; boundary=ESGST`
                  },
                  method: `POST`,
                  url: `https://www.googleapis.com/batch/drive/v3`
                })).responseText;
                const parts = result.replace(/\r?\n|\r/g, `\n`).replace(/\n\n+/g, `\n\n`).split(/--batch.*\n/).filter(x => x).map(x => x.split(/\n\n/)[2]);
                for (const [index, part] of parts.entries()) {
                  if (part) {
                    failed += 1;
                  } else {
                    selectedFiles[chunk[index]].item.remove();
                  }
                }
              }
              selectedFiles = {};
              let icon, title;
              if (failed > 0) {
                icon = `fa-times`;
                title = `An error happened while deleting ${failed} of the files.`;
              } else {
                icon = `fa-check`;
                title = `Files deleted with success.`;
              }         
              const tempPopup = new Popup({ icon, title, isTemp: true });
              tempPopup.open();
              resolve();
            }, resolve)
          });
        }
      }).set, popup.actions);
      JSON.parse((await shared.common.request({
        headers: {
          authorization: `Bearer ${value}`
        },
        method: `GET`,
        url: `https://www.googleapis.com/drive/v3/files?fields=files(kind,id,name,mimeType,size)&spaces=appDataFolder`
      })).responseText).files.forEach(file => {        
        const item = shared.common.createElements_v2(entries, `beforeEnd`, [
          [`div`, { class: `esgst-clickable esgst-restore-entry` }, [
            [`span`],
            [`span`, `${file.name} - ${shared.common.convertBytes(file.size)}`],
            [`i`, { class: `fa fa-times-circle`, title: `Delete file` }]
          ]]
        ]);
        const checkbox = new Checkbox(item.firstElementChild);
        checkbox.onEnabled = () => selectedFiles[file.id] = { item };
        checkbox.onDisabled = () => delete selectedFiles[file.id];
        item.firstElementChild.nextElementSibling.addEventListener(`click`, () => {
          shared.common.createConfirmation(`Are you sure you want to restore the selected data?`, async () => {
            canceled = false;
            popup.close();
            dm.data = JSON.parse((await shared.common.request({
              blob: file.name.match(/\.zip$/),
              headers: {
                authorization: `Bearer ${value}`
              },
              method: `GET`,
              url: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`
            })).responseText);
            // noinspection JSIgnoredPromiseFromCall
            manageData(dm, false, false, false, false, callback);
          });
        });
        item.lastElementChild.addEventListener(`click`, () => {
          shared.common.createConfirmation(`WARNING: Are you sure you want to delete this file?`, async () => {
            const tempPopup = new Popup({ icon: `fa-circle-o-notch fa-spin`, title: `Deleting file...`, isTemp: true });
            tempPopup.open();
            const result = (await shared.common.request({
              headers: {
                authorization: `Bearer ${value}`
              },
              method: `DELETE`,
              url: `https://www.googleapis.com/drive/v3/files/${file.id}`
            })).responseText;
            if (result) {
              tempPopup.setIcon(`fa-times`);
              tempPopup.setTitle(`An error happened while deleting the file.`);
            } else {
              item.remove();
              tempPopup.setIcon(`fa-check`);
              tempPopup.setTitle(`File deleted with success.`);
            }
          });
        });
      });
    }
  } else {
    window.setTimeout(() => checkGoogleDriveComplete(data, dm, callback), 250);
  }
}

async function checkOneDriveComplete(data, dm, callback) {
  let value = shared.common.getValue(`oneDriveToken`);
  if (value) {
    if (dm.type === `export` || (data && gSettings.exportBackup)) {
      const name = gSettings.askFileName ? window.prompt(`Enter the name of the file:`, `esgst_data_${new Date().toISOString().replace(/:/g, `_`)}`) : `esgst_data_${new Date().toISOString().replace(/:/g, `_`)}`;
      if (name === null) {
        callback();
        return;
      }
      let responseText = ``;
      try {
        const response = await shared.common.request({
          anon: true,
          data: JSON.stringify(data),
          fileName: gSettings.backupZip ? `${name}.json` : null,
          headers: {
            Authorization: `bearer ${value}`,
            [`Content-Type`]: gSettings.backupZip ? `application/zip` : `text/plain`
          },
          method: `PUT`,
          url: gSettings.backupZip ? `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${name}.zip:/content` : `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${name}.json:/content`
        });
        responseText = response.responseText;
        const responseJson = JSON.parse(responseText);
        if (!responseJson.id) {
          // noinspection ExceptionCaughtLocallyJS
          throw ``;
        }
        if (!dm.autoBackup) {
          shared.common.createFadeMessage(dm.message, `Data ${dm.pastTense} with success!`);
        }
        callback();
      } catch (e) {
        callback();
        window.alert(`An error occurred when uploading the file.\n\n${e}\n\n${responseText}`);
      }
    } else {
      let canceled = true;
      let popup = new Popup({
        addScrollable: true,
        icon: `fa-windows`,
        isTemp: true,
        title: `Select a file to restore:`
      });
      popup.onClose = () => {
        if (canceled) {
          callback();
        }
      };
      popup.open();
      let selectedFiles = {};
      let entries = shared.common.createElements(popup.scrollable, `beforeEnd`, [{
        attributes: {
          class: `popup__keys__list`
        },
        type: `div`
      }]);
      popup.popup.insertBefore(new ButtonSet({
        color1: `green`,
        color2: `grey`,
        icon1: `fa-trash`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `Delete selected files`,
        title2: `Deleting...`,
        callback1: () => {
          return new Promise(resolve => {
            if (!Object.keys(selectedFiles).length) {
              resolve();
              return;
            }
            shared.common.createConfirmation(`WARNING: Are you sure you want to delete the selected files?`, async () => {
              const result = JSON.parse((await shared.common.request({
                anon: true,
                data: JSON.stringify({
                  requests: Object.keys(selectedFiles).map(x => ({
                    id: x,
                    method: `DELETE`,
                    url: `/me/drive/items/${x}`
                  }))
                }),
                headers: {
                  Authorization: `Bearer ${value}`,
                  [`Content-Type`]: `application/json`
                },
                method: `POST`,
                url: `https://graph.microsoft.com/v1.0/$batch`
              })).responseText);
              let failed = 0;
              for (const response of result.responses) {
                if (response.status === 204) {
                  selectedFiles[response.id].item.remove();
                } else {
                  failed += 1;
                }
              }
              selectedFiles = {};
              let icon, title;
              if (failed > 0) {
                icon = `fa-times`;
                title = `An error happened while deleting ${failed} of the files.`;
              } else {
                icon = `fa-check`;
                title = `Files deleted with success.`;
              }         
              const tempPopup = new Popup({ icon, title, isTemp: true });
              tempPopup.open();
              resolve();
            }, resolve)
          });
        }
      }).set, popup.actions);
      JSON.parse((await shared.common.request({
        anon: true,
        headers: {
          Authorization: `bearer ${value}`
        },
        method: `GET`,
        url: `https://graph.microsoft.com/v1.0/me/drive/special/approot/children`
      })).responseText).value.reverse().forEach(file => {
        const item = shared.common.createElements_v2(entries, `beforeEnd`, [
          [`div`, { class: `esgst-clickable esgst-restore-entry` }, [
            [`span`],
            [`span`, `${file.name} - ${shared.common.convertBytes(file.size)}`],
            [`i`, { class: `fa fa-times-circle`, title: `Delete file` }]
          ]]
        ]);
        const checkbox = new Checkbox(item.firstElementChild);
        checkbox.onEnabled = () => selectedFiles[file.id] = { item };
        checkbox.onDisabled = () => delete selectedFiles[file.id];
        item.firstElementChild.nextElementSibling.addEventListener(`click`, () => {
          shared.common.createConfirmation(`Are you sure you want to restore the selected data?`, async () => {
            canceled = false;
            popup.close();
            dm.data = JSON.parse((await shared.common.request({
              anon: true,
              blob: file.name.match(/\.zip$/),
              headers: {
                authorization: `Bearer ${value}`
              },
              method: `GET`,
              url: `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}/content`
            })).responseText);
            // noinspection JSIgnoredPromiseFromCall
            manageData(dm, false, false, false, false, callback);
          });
        });
        item.lastElementChild.addEventListener(`click`, () => {
          shared.common.createConfirmation(`WARNING: Are you sure you want to delete this file?`, async () => {
            const tempPopup = new Popup({ icon: `fa-circle-o-notch fa-spin`, title: `Deleting file...`, isTemp: true });
            tempPopup.open();
            const result = (await shared.common.request({
              anon: true,
              headers: {
                authorization: `Bearer ${value}`
              },
              method: `DELETE`,
              url: `https://graph.microsoft.com/v1.0/me/drive/items/${file.id}`
            })).responseText;
            if (result) {
              tempPopup.setIcon(`fa-times`);
              tempPopup.setTitle(`An error happened while deleting the file.`);
            } else {
              item.remove();
              tempPopup.setIcon(`fa-check`);
              tempPopup.setTitle(`File deleted with success.`);
            }
          });
        });
      });
    }
  } else {
    window.setTimeout(() => checkOneDriveComplete(data, dm, callback), 250);
  }
}

function loadDataManagement(type, isPopup, callback) {
  let containerr, context, group1, group2, i, n, onClick, option, prep, section, title1, title2;
  let dm = {
    autoBackup: callback && shared.esgst.parameters.autoBackup,
    type: type
  };
  dm[type] = true;
  switch (type) {
    case `import`:
      onClick = loadImportFile.bind(null);
      prep = `from`;
      title1 = `Restore`;
      title2 = `Restoring`;
      dm.pastTense = `restored`;
      break;
    case `export`:
      onClick = manageData.bind(null);
      prep = `to`;
      title1 = `Backup`;
      title2 = `Backing up`;
      dm.pastTense = `backed up`;
      break;
    case `delete`:
      onClick = confirmDataDeletion.bind(null);
      prep = `from`;
      title1 = `Delete`;
      title2 = `Deleting`;
      dm.pastTense = `deleted`;
      break;
  }
  let popup = null;
  if (!dm.autoBackup) {
    if (isPopup) {
      popup = new Popup({
        addScrollable: `left`,
        settings: true,
        isTemp: true
      });
      containerr = popup.description;
      context = popup.scrollable;
    } else {
      context = containerr = shared.esgst.sidebar.nextElementSibling;
      context.setAttribute(`data-esgst-popup`, `true`);
      context.innerHTML = ``;
    }
    containerr.classList.add(`esgst-text-left`);
    const heading = new elementBuilder[shared.esgst.name].pageHeading({
      context: containerr,
      position: `afterBegin`,
      breadcrumbs: [
        {
          name: `ESGST`,
          url: shared.esgst.settingsUrl
        },
        {
          name: title1,
          url: shared.esgst[`${title1.toLowerCase()}Url`]
        }
      ]
    }).pageHeading;
    if (!isPopup) {
      shared.esgst.mainPageHeading = heading;
    }
    dm.computerSpace = shared.common.createElements(containerr, `beforeEnd`, [{
      type: `div`,
      children: [{
        text: `Total: `,
        type: `node`
      }, {
        attributes: {
          class: `esgst-bold`
        },
        type: `span`
      }, {
        attributes: {
          class: `esgst-clickable fa fa-refresh`,
          title: `Calculate/refresh data sizes`
        },
        type: `i`
      }]
    }]);
    dm.computerSpaceCount = dm.computerSpace.firstElementChild;
    dm.computerSpaceCount.nextElementSibling.addEventListener(`click`, () => getDataSizes(dm));
    section = settingsModule.createMenuSection(context, null, 1, title1);
  }
  dm.switches = {};
  dm.options = [
    {
      check: true,
      key: `decryptedGiveaways`,
      name: `Decrypted Giveaways`
    },
    {
      check: true,
      key: `discussions`,
      name: `Discussions`,
      options: [
        {
          key: `discussions_main`,
          name: `Main`
        },
        {
          key: `discussions_ct`,
          name: `Comment Tracker`
        },
        {
          key: `discussions_df`,
          name: `Discussion Filters`
        },
        {
          key: `discussions_dh`,
          name: `Discussion Highlighter`
        },
        {
          key: `discussions_dt`,
          name: `Discussion Tags`
        },
        {
          key: `discussions_gdttt`,
          name: `Giveaway/Discussion/Ticket/Trade Tracker`
        },
        {
          key: `discussions_pm`,
          name: `Puzzle Marker`
        }
      ]
    },
    {
      check: true,
      key: `emojis`,
      name: `Emojis`
    },
    {
      check: true,
      key: `entries`,
      name: `Entries`
    },
    {
      check: true,
      key: `games`,
      name: `Games`,
      options: [
        {
          key: `games_main`,
          name: `Main`
        },
        {
          key: `games_egh`,
          name: `Entered Game Highlighter`
        },
        {
          key: `games_gt`,
          name: `Game Tags`
        },
        {
          key: `games_itadi`,
          name: `IsThereAnyDeal Info`
        }
      ]
    },
    {
      check: true,
      key: `giveaways`,
      name: `Giveaways`,
      options: [
        {
          key: `giveaways_main`,
          name: `Main`
        },
        {
          key: `giveaways_ct`,
          name: `Comment Tracker`
        },
        {
          key: `giveaways_gb`,
          name: `Giveaway Bookmarks`
        },
        {
          key: `giveaways_gdttt`,
          name: `Giveaway/Discussion/Ticket/Trade Tracker`
        },
        {
          key: `giveaways_gf`,
          name: `Giveaway Filters`
        },
        {
          key: `giveaways_ggl`,
          name: `Giveaway Group Loader`
        }
      ]
    },
    {
      check: true,
      key: `groups`,
      name: `Groups`,
      options: [
        {
          key: `groups_main`,
          name: `Main`
        },
        {
          key: `groups_gpt`,
          name: `Group Tags`
        },
        {
          key: `groups_sgg`,
          name: `Stickied Giveaway Groups`
        }
      ]
    },
    {
      check: true,
      key: `rerolls`,
      name: `Rerolls`
    },
    {
      check: true,
      key: `savedReplies`,
      name: `Saved Replies`
    },
    {
      check: true,
      key: `settings`,
      name: `Settings`
    },
    {
      check: true,
      key: `sgCommentHistory`,
      name: `SG Comment History`
    },
    {
      check: true,
      key: `stickiedCountries`,
      name: `Stickied Giveaway Countries`
    },
    {
      check: true,
      key: `templates`,
      name: `Templates`
    },
    {
      check: true,
      key: `themes`,
      name: `Themes`
    },
    {
      check: true,
      key: `tickets`,
      name: `Tickets`,
      options: [
        {
          key: `tickets_main`,
          name: `Main`
        },
        {
          key: `tickets_ct`,
          name: `Comment Tracker`
        },
        {
          key: `tickets_gdttt`,
          name: `Giveaway/Discussion/Ticket/Trade Tracker`
        },
        {
          key: `tickets_ust`,
          name: `User Suspension Tracker`
        }
      ]
    },
    {
      check: true,
      key: `trades`,
      name: `Trades`,
      options: [
        {
          key: `trades_main`,
          name: `Main`
        },
        {
          key: `trades_ct`,
          name: `Comment Tracker`
        },
        {
          key: `trades_tf`,
          name: `Trade Filters`
        },
        {
          key: `trades_gdttt`,
          name: `Giveaway/Discussion/Ticket/Trade Tracker`
        }
      ]
    },
    {
      check: true,
      key: `users`,
      name: `Users`,
      options: [
        {
          key: `users_main`,
          name: `Main`
        },
        {
          key: `users_namwc`,
          name: `Not Activated/Multiple Win  Checker`
        },
        {
          key: `users_nrf`,
          name: `Not Received Finder`
        },
        {
          key: `users_uf`,
          name: `User Filters`
        },
        {
          key: `users_giveaways`,
          name: `Giveaways Data`
        },
        {
          key: `users_notes`,
          name: `User Notes`
        },
        {
          key: `users_tags`,
          name: `User Tags`
        },
        {
          key: `users_wbc`,
          name: `Whitelist/Blacklist Checker`
        }
      ]
    },
    {
      check: true,
      key: `winners`,
      name: `Winners`
    }
  ];
  if (dm.autoBackup) {
    let dropbox, googleDrive, oneDrive;
    switch (gSettings.autoBackup_index) {
      case 0:
        break;
      case 1:
        dropbox = true;
        break;
      case 2:
        googleDrive = true;
        break;
      case 3:
        oneDrive = true;
        break;
    }
    // noinspection JSIgnoredPromiseFromCall
    manageData(dm, dropbox, googleDrive, oneDrive, false, async () => {
      shared.common.delLocalValue(`isBackingUp`);
      await shared.common.setSetting(`lastBackup`, Date.now());
      callback();
    });
  } else {
    for (i = 0, n = dm.options.length; i < n; ++i) {
      option = dm.options[i];
      if (option.check) {
        section.lastElementChild.appendChild(getDataMenu(option, dm.switches, type));
      }
    }
    if (type === `import` || type === `delete`) {
      if (type === `import`) {
        dm.input = shared.common.createElements(containerr, `beforeEnd`, [{
          attributes: {
            type: `file`
          },
          type: `input`
        }]);
        new ToggleSwitch(containerr, `importAndMerge`, false, `Merge`, false, false, `Merges the current data with the backup instead of replacing it.`, gSettings.importAndMerge);
      }
      let select = new ToggleSwitch(containerr, `exportBackup`, false, [
        `Backup to `,
        [`select`, [
          [`option`, `Computer`],
          [`option`, `Dropbox`],
          [`option`, `Google Drive`],
          [`option`, `OneDrive`]
        ]]
      ], false, false, `Backs up the current data to one of the selected places before restoring another backup.`, gSettings.exportBackup).name.firstElementChild;
      select.selectedIndex = gSettings.exportBackupIndex;
      select.addEventListener(`change`, () => {
        // noinspection JSIgnoredPromiseFromCall
        shared.common.setSetting(`exportBackupIndex`, select.selectedIndex);
      });
    }
    if (type === `import` || type === `export`) {
      shared.common.observeChange(new ToggleSwitch(containerr, `usePreferredGoogle`, false, [
        `Use preferred Google account: `,
        [`input`, { class: `esgst-switch-input esgst-switch-input-large`, placeholder: `example@gmail.com`, type: `text` }],
        [`span`, { class: `esgst-bold esgst-clickable`, onclick: () => window.alert(gSettings.preferredGoogle || `No email address defined`) }, `Reveal`]
      ], false, false, `With this option enabled, you will not be prompted to select an account when restoring/backing up to Google Drive. The account associated with the email address entered here will be automatically selected if you're already logged in. For security purposes, the email address will not be visible if you re-open the menu. After that, you have to click on "Reveal" to see it.`, gSettings.usePreferredGoogle).name.firstElementChild, `preferredGoogle`, true);
      shared.common.observeChange(new ToggleSwitch(containerr, `usePreferredMicrosoft`, false, [
        `Use preferred Microsoft account: `,
        [`input`, { class: `esgst-switch-input esgst-switch-input-large`, placeholder: `example@outlook.com`, type: `text` }],
        [`span`, { class: `esgst-bold esgst-clickable`, onclick: () => window.alert(gSettings.preferredMicrosoft || `No email address defined`) }, `Reveal`]
      ], false, false, `With this option enabled, you will not be prompted to select an account when restoring/backing up to OneDrive. The account associated with the email address entered here will be automatically selected if you're already logged in. For security purposes, the email address will not be visible if you re-open the menu. After that, you have to click on "Reveal" to see it.`, gSettings.usePreferredMicrosoft).name.firstElementChild, `preferredMicrosoft`, true);
    }
    dm.message = shared.common.createElements(containerr, `beforeEnd`, [{
      attributes: {
        class: `esgst-description`
      },
      type: `div`
    }]);
    dm.warning = shared.common.createElements(containerr, `beforeEnd`, [{
      attributes: {
        class: `esgst-description esgst-warning`
      },
      type: `div`
    }]);
    group1 = shared.common.createElements(containerr, `beforeEnd`, [{
      attributes: {
        class: `esgst-button-group`
      },
      type: `div`,
      children: [{
        text: `Select:`,
        type: `span`
      }]
    }]);
    group1.appendChild(new ButtonSet({
      color1: `grey`,
      color2: `grey`,
      icon1: `fa-square`,
      icon2: `fa-circle-o-notch fa-spin`,
      title1: `All`,
      title2: ``,
      callback1: shared.common.selectSwitches.bind(shared.common, dm.switches, `enable`, group1)
    }).set);
    group1.appendChild(new ButtonSet({
      color1: `grey`,
      color2: `grey`,
      icon1: `fa-square-o`,
      icon2: `fa-circle-o-notch fa-spin`,
      title1: `None`,
      title2: ``,
      callback1: shared.common.selectSwitches.bind(shared.common, dm.switches, `disable`, group1)
    }).set);
    group1.appendChild(new ButtonSet({
      color1: `grey`,
      color2: `grey`,
      icon1: `fa-plus-square-o`,
      icon2: `fa-circle-o-notch fa-spin`,
      title1: `Inverse`,
      title2: ``,
      callback1: shared.common.selectSwitches.bind(shared.common, dm.switches, `toggle`, group1)
    }).set);
    group2 = shared.common.createElements(containerr, `beforeEnd`, [{
      attributes: {
        class: `esgst-button-group`
      },
      type: `div`,
      children: [{
        text: `${title1} ${prep}:`,
        type: `span`
      }]
    }]);
    group2.appendChild(new ButtonSet({
      color1: `green`,
      color2: `grey`,
      icon1: `fa-desktop`,
      icon2: `fa-circle-o-notch fa-spin`,
      title1: `Computer`,
      title2: title2,
      callback1: () => {
        return new Promise(async resolve => {
          if (dm.type !== `export`) {
            let result;
            switch (gSettings.exportBackupIndex) {
              case 0:
                result = true;
              case 1:
                result = await permissions.requestUi([`dropbox`], `storage`);
                break;
              case 2:
                result = await permissions.requestUi([`googleDrive`], `storage`);
                break;
              case 3:
                result = await permissions.requestUi([`oneDrive`], `storage`);
                break;
            }
            if (!result) {
              resolve();
              return;
            }
          }

          onClick(dm, false, false, false, false, () => {
            // noinspection JSIgnoredPromiseFromCall
            manageData(dm, false, false, false, true);
            resolve();
          });
        });
      }
    }).set);
    if (type !== `delete`) {
      group2.appendChild(new ButtonSet({
        color1: `green`,
        color2: `grey`,
        icon1: `fa-dropbox`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `Dropbox`,
        title2: title2,
        callback1: () => {
          return new Promise(async resolve => {
            if (!(await permissions.requestUi([`dropbox`], `storage`))) {
              resolve();
              return;
            }

            onClick(dm, true, false, false, false, () => {
              // noinspection JSIgnoredPromiseFromCall
              manageData(dm, false, false, false, true);
              resolve();
            });
          });
        }
      }).set);
      group2.appendChild(new ButtonSet({
        color1: `green`,
        color2: `grey`,
        icon1: `fa-google`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `Google Drive`,
        title2: title2,
        callback1: () => {
          return new Promise(async resolve => {
            if (!(await permissions.requestUi([`googleDrive`], `storage`))) {
              resolve();
              return;
            }

            onClick(dm, false, true, false, false, () => {
              // noinspection JSIgnoredPromiseFromCall
              manageData(dm, false, false, false, true);
              resolve();
            });
          });
        }
      }).set);
      group2.appendChild(new ButtonSet({
        color1: `green`,
        color2: `grey`,
        icon1: `fa-windows`,
        icon2: `fa-circle-o-notch fa-spin`,
        title1: `OneDrive`,
        title2: title2,
        callback1: () => {
          return new Promise(async resolve => {
            if (!(await permissions.requestUi([`oneDrive`], `storage`))) {
              resolve();
              return;
            }

            onClick(dm, false, false, true, false, () => {
              // noinspection JSIgnoredPromiseFromCall
              manageData(dm, false, false, false, true);
              resolve();
            });
          });
        }
      }).set);
    }
    if (isPopup) {
      popup.open();
    }
    if (gSettings[`calculate${shared.common.capitalizeFirstLetter(type)}`]) {
      getDataSizes(dm);
    }
  }
}

function loadDataCleaner(isPopup) {
  let containerr = null;
  let context = null;
  if (isPopup) {
    const popup = new Popup({
      addScrollable: `left`,
      settings: true,
      isTemp: true
    });
    containerr = popup.description;
    context = popup.scrollable;
    popup.open();
  } else {
    containerr = shared.esgst.sidebar.nextElementSibling;
    containerr.innerHTML = ``;
    context = containerr;
    context.setAttribute(`data-esgst-popup`, `true`);
  }
  const heading = new elementBuilder[shared.esgst.name].pageHeading({
    context: containerr,
    position: `afterBegin`,
    breadcrumbs: [{
      name: `ESGST`,
      url: shared.esgst.settingsUrl
    }, {
      name: `Clean`,
      url: shared.esgst.cleanUrl
    }]
  }).pageHeading;
  if (!isPopup) {
    shared.esgst.mainPageHeading = heading;
  }
  shared.common.createElements(context, `beforeEnd`, [{
    attributes: {
      class: `esgst-bold esgst-description esgst-red`
    },
    text: `Make sure to backup your data before using the cleaner.`,
    type: `div`
  }]);
  shared.common.observeNumChange(new ToggleSwitch(context, `cleanDiscussions`, false, [
    `Discussions data older than `,
    [`input`, { class: `esgst-switch-input`, type: `text`, value: gSettings.cleanDiscussions_days }],
    ` days.`
  ], false, false, `Discussions data only started being date-tracked since v7.11.0, so not all old data may be cleaned.`, gSettings.cleanDiscussions).name.firstElementChild, `cleanDiscussions_days`, true);
  shared.common.observeNumChange(new ToggleSwitch(context, `cleanEntries`, false, [
    `Entries data older than `,
    [`input`, { class: `esgst-switch-input`, type: `text`, value: gSettings.cleanEntries_days }],
    ` days.`
  ], false, false, ``, gSettings.cleanEntries).name.firstElementChild, `cleanEntries_days`, true);
  shared.common.observeNumChange(new ToggleSwitch(context, `cleanGiveaways`, false, [
    `Giveaways data older than `,
    [`input`, { class: `esgst-switch-input`, type: `text`, value: gSettings.cleanGiveaways_days }],
    ` days.`
  ], false, false, `Some giveaways data only started being date-tracked since v7.11.0, so not all old data may be cleaned.`, gSettings.cleanGiveaways).name.firstElementChild, `cleanGiveaways_days`, true);
  shared.common.observeNumChange(new ToggleSwitch(context, `cleanSgCommentHistory`, false, [
    `SteamGifts comment history data older than `,
    [`input`, { class: `esgst-switch-input`, type: `text`, value: gSettings.cleanSgCommentHistory_days }],
    ` days.`
  ], false, false, ``, gSettings.cleanSgCommentHistory).name.firstElementChild, `cleanSgCommentHistory_days`, true);
  shared.common.observeNumChange(new ToggleSwitch(context, `cleanTickets`, false, [
    `Tickets data older than `,
    [`input`, { class: `esgst-switch-input`, type: `text`, value: gSettings.cleanTickets_days }],
    ` days.`
  ], false, false, `Tickets data only started being date-tracked since v7.11.0, so not all old data may be cleaned.`, gSettings.cleanTickets).name.firstElementChild, `cleanTickets_days`, true);
  shared.common.observeNumChange(new ToggleSwitch(context, `cleanTrades`, false, [
    `Trades data older than `,
    [`input`, { class: `esgst-switch-input`, type: `text`, value: gSettings.cleanTrades_days }],
    ` days.`
  ], false, false, `Trades data only started being date-tracked since v7.11.0, so not all old data may be cleaned.`, gSettings.cleanTrades).name.firstElementChild, `cleanTrades_days` , true);
  new ToggleSwitch(context, `cleanDuplicates`, false, `Duplicate data.`, false, false, `Cleans up any duplicate data it finds.`, gSettings.cleanDuplicates);
  context.appendChild(new ButtonSet({
    color1: `green`,
    color2: `grey`,
    icon1: `fa-check`,
    icon2: `fa-circle-o-notch fa-spin`,
    title1: `Clean`,
    title2: `Cleaning...`,
    callback1: async () => {
      const dm = {};
      dm.options = [
        {
          check: true,
          key: `decryptedGiveaways`,
          name: `Decrypted Giveaways`
        },
        {
          check: true,
          key: `discussions`,
          name: `Discussions`,
          options: [
            {
              key: `discussions_main`,
              name: `Main`
            },
            {
              key: `discussions_ct`,
              name: `Comment Tracker`
            },
            {
              key: `discussions_df`,
              name: `Discussion Filters`
            },
            {
              key: `discussions_dh`,
              name: `Discussion Highlighter`
            },
            {
              key: `discussions_dt`,
              name: `Discussion Tags`
            },
            {
              key: `discussions_gdttt`,
              name: `Giveaway/Discussion/Ticket/Trade Tracker`
            },
            {
              key: `discussions_pm`,
              name: `Puzzle Marker`
            }
          ]
        },
        {
          check: true,
          key: `emojis`,
          name: `Emojis`
        },
        {
          check: true,
          key: `entries`,
          name: `Entries`
        },
        {
          check: true,
          key: `games`,
          name: `Games`,
          options: [
            {
              key: `games_main`,
              name: `Main`
            },
            {
              key: `games_egh`,
              name: `Entered Game Highlighter`
            },
            {
              key: `games_gt`,
              name: `Game Tags`
            },
            {
              key: `games_itadi`,
              name: `IsThereAnyDeal Info`
            }
          ]
        },
        {
          check: true,
          key: `giveaways`,
          name: `Giveaways`,
          options: [
            {
              key: `giveaways_main`,
              name: `Main`
            },
            {
              key: `giveaways_ct`,
              name: `Comment Tracker`
            },
            {
              key: `giveaways_gb`,
              name: `Giveaway Bookmarks`
            },
            {
              key: `giveaways_gdttt`,
              name: `Giveaway/Discussion/Ticket/Trade Tracker`
            },
            {
              key: `giveaways_gf`,
              name: `Giveaway Filters`
            },
            {
              key: `giveaways_ggl`,
              name: `Giveaway Group Loader`
            }
          ]
        },
        {
          check: true,
          key: `groups`,
          name: `Groups`,
          options: [
            {
              key: `groups_main`,
              name: `Main`
            },
            {
              key: `groups_gpt`,
              name: `Group Tags`
            },
            {
              key: `groups_sgg`,
              name: `Stickied Giveaway Groups`
            }
          ]
        },
        {
          check: true,
          key: `rerolls`,
          name: `Rerolls`
        },
        {
          check: true,
          key: `savedReplies`,
          name: `Saved Replies`
        },
        {
          check: true,
          key: `settings`,
          name: `Settings`
        },
        {
          check: true,
          key: `sgCommentHistory`,
          name: `SG Comment History`
        },
        {
          check: true,
          key: `stickiedCountries`,
          name: `Stickied Giveaway Countries`
        },
        {
          check: true,
          key: `templates`,
          name: `Templates`
        },
        {
          check: true,
          key: `tickets`,
          name: `Tickets`,
          options: [
            {
              key: `tickets_main`,
              name: `Main`
            },
            {
              key: `tickets_ct`,
              name: `Comment Tracker`
            },
            {
              key: `tickets_gdttt`,
              name: `Giveaway/Discussion/Ticket/Trade Tracker`
            },
            {
              key: `tickets_ust`,
              name: `User Suspension Tracker`
            }
          ]
        },
        {
          check: true,
          key: `trades`,
          name: `Trades`,
          options: [
            {
              key: `trades_main`,
              name: `Main`
            },
            {
              key: `trades_ct`,
              name: `Comment Tracker`
            },
            {
              key: `trades_tf`,
              name: `Trade Filters`
            },
            {
              key: `trades_gdttt`,
              name: `Giveaway/Discussion/Ticket/Trade Tracker`
            }
          ]
        },
        {
          check: true,
          key: `users`,
          name: `Users`,
          options: [
            {
              key: `users_main`,
              name: `Main`
            },
            {
              key: `users_namwc`,
              name: `Not Activated/Multiple Win  Checker`
            },
            {
              key: `users_nrf`,
              name: `Not Received Finder`
            },
            {
              key: `users_uf`,
              name: `User Filters`
            },
            {
              key: `users_giveaways`,
              name: `Giveaways Data`
            },
            {
              key: `users_notes`,
              name: `User Notes`
            },
            {
              key: `users_tags`,
              name: `User Tags`
            },
            {
              key: `users_wbc`,
              name: `Whitelist/Blacklist Checker`
            }
          ]
        },
        {
          check: true,
          key: `winners`,
          name: `Winners`
        }
      ];
      const oldSize = await manageData(dm, false, false, false, true);
      let currentTime = Date.now();
      let toSave = {};
      if (gSettings.cleanDiscussions) {
        let days = gSettings.cleanDiscussions_days * 86400000;
        toSave.discussions = JSON.parse(shared.common.getValue(`discussions`, `{}`));
        for (let code in toSave.discussions) {
          if (toSave.discussions.hasOwnProperty(code)) {
            let item = toSave.discussions[code];
            if (item.author !== gSettings.username && item.lastUsed && currentTime - item.lastUsed > days) {
              delete toSave.discussions[code];
            }
          }
        }
      }
      if (gSettings.cleanEntries) {
        let days = gSettings.cleanEntries_days * 86400000;
        let items = JSON.parse(shared.common.getValue(`entries`, `[]`));
        toSave.entries = [];
        items.forEach(item => {
          if (currentTime - item.timestamp <= days) {
            toSave.entries.push(item);
          }
        });
      }
      if (gSettings.cleanGiveaways) {
        let days = gSettings.cleanGiveaways_days * 86400000;
        toSave.giveaways = JSON.parse(shared.common.getValue(`giveaways`, `{}`));
        for (let code in toSave.giveaways) {
          if (toSave.giveaways.hasOwnProperty(code)) {
            let item = toSave.giveaways[code];
            if (item.creator !== gSettings.username && ((item.endTime && currentTime - item.endTime > days) || (item.lastUsed && currentTime - item.lastUsed > days))) {
              delete toSave.giveaways[code];
            }
          }
        }
      }
      if (gSettings.cleanSgCommentHistory) {
        let days = gSettings.cleanSgCommentHistory_days * 86400000;
        let items = JSON.parse(shared.common.getValue(`sgCommentHistory`, `[]`));
        toSave.sgCommentHistory = [];
        items.forEach(item => {
          if (currentTime - item.timestamp <= days) {
            toSave.sgCommentHistory.push(item);
          }
        });
      }
      if (gSettings.cleanTickets) {
        let days = gSettings.cleanTickets_days * 86400000;
        toSave.tickets = JSON.parse(shared.common.getValue(`tickets`, `{}`));
        for (let code in toSave.tickets) {
          if (toSave.tickets.hasOwnProperty(code)) {
            let item = toSave.tickets[code];
            if (item.author !== gSettings.username && item.lastUsed && currentTime - item.lastUsed > days) {
              delete toSave.tickets[code];
            }
          }
        }
      }
      if (gSettings.cleanTrades) {
        let days = gSettings.cleanTrades_days * 86400000;
        toSave.trades = JSON.parse(shared.common.getValue(`trades`, `{}`));
        for (let code in toSave.trades) {
          if (toSave.trades.hasOwnProperty(code)) {
            let item = toSave.trades[code];
            if (item.author !== gSettings.username && item.lastUsed && currentTime - item.lastUsed > days) {
              delete toSave.trades[code];
            }
          }
        }
      }
      if (gSettings.cleanDuplicates) {
        toSave.users = JSON.parse(shared.common.getValue(`users`, `{"steamIds":{},"users":{}}`));
        for (let id in toSave.users.users) {
          if (toSave.users.users.hasOwnProperty(id)) {
            let giveaways = toSave.users.users[id].giveaways;
            if (giveaways) {
              [`sent`, `won`].forEach(mainType => {
                [`apps`, `subs`].forEach(type => {
                  for (let code in giveaways[mainType][type]) {
                    if (giveaways[mainType][type].hasOwnProperty(code)) {
                      giveaways[mainType][type][code] = Array.from(/** @type {ArrayLike} */ new Set(giveaways[mainType][type][code]));
                    }
                  }
                });
              });
            }
          }
        }
      }
      for (let key in toSave) {
        if (toSave.hasOwnProperty(key)) {
          toSave[key] = JSON.stringify(toSave[key]);
        }
      }
      await shared.common.setValues(toSave);
      const newSize = await manageData(dm, false, false, false, true);
      const successPopup = new Popup({
        icon: `fa-check`,
        title: [
          `Success! The selected data was cleaned.`,
          [`br`],
          [`br`],
          `Size before cleaning: `,
          [`span`, { class: `esgst-bold` }, shared.common.convertBytes(oldSize)],
          [`br`],
          `Size after cleaning: `,
          [`span`, { class: `esgst-bold` }, shared.common.convertBytes(newSize)],
          [`br`],
          [`br`],
          `${Math.round((100 - (newSize / oldSize * 100)) * 100) / 100}% reduction`
        ]
      });
      successPopup.open();
    }
  }).set);
}

async function manageData(dm, dropbox, googleDrive, oneDrive, space, callback) {
  let data = {};
  let totalSize = 0;
  let mainUsernameFound;
  for (let i = 0, n = dm.options.length; i < n; i++) {
    let option = dm.options[i];
    let optionKey = option.key;
    if (!option.check || (!dm.autoBackup && !space && !gSettings[`${dm.type}_${optionKey}`])) {
      continue;
    }
    let values = null;
    let mainFound, mergedData, sizes;
    // noinspection FallThroughInSwitchStatementJS
    switch (optionKey) {
      case `decryptedGiveaways`:
      case `settings`:
        data[optionKey] = JSON.parse(shared.common.getValue(optionKey, `{}`));
        if (!space) {
          if (dm.import) {
            let newData = dm.data[optionKey];
            if (newData) {
              if (gSettings.importAndMerge) {
                mergedData = data[optionKey];
                for (let newDataKey in newData) {
                  if (newData.hasOwnProperty(newDataKey)) {
                    mergedData[newDataKey] = newData[newDataKey];
                  }
                }
                await shared.common.setValue(optionKey, JSON.stringify(mergedData));
              } else {
                await shared.common.setValue(optionKey, JSON.stringify(newData));
              }
            }
          } else if (dm.delete) {
            await shared.common.delValue(optionKey);
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":${shared.common.getValue(optionKey, `{}`)}}`.length;
          totalSize += size;
          if (dm.switches) {
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(size);
          }
        }
        break;
      case `discussions`:
        if (!values) {
          values = {
            main: [`lastUsed`],
            ct: [`count`, `readComments`],
            df: [`hidden`],
            dh: [`highlighted`],
            dt: [`tags`],
            gdttt: [`visited`],
            pm: [`status`]
          };
        }
      case `giveaways`:
        if (!values) {
          values = {
            main: [`code`, `comments`, `copies`, `creator`, `endTime`, `entries`, `gameId`, `gameName`, `gameSteamId`, `gameType`, `group`, `inviteOnly`, `lastUsed`, `level`, `points`, `regionRestricted`, `started`, `startTime`, `whitelist`, `winners`],
            ct: [`count`, `readComments`],
            gb: [`bookmarked`],
            gdttt: [`visited`],
            gf: [`hidden`],
            ggl: [`groups`]
          };
        }
      case `tickets`:
        if (!values) {
          values = {
            main: [`lastUsed`],
            ct: [`count`, `readComments`],
            gdttt: [`visited`],
            ust: [`sent`]
          };
        }
      case `trades`:
        if (!values) {
          values = {
            main: [`lastUsed`],
            ct: [`count`, `readComments`],
            tf: [`hidden`],
            gdttt: [`visited`]
          };
        }
        data[optionKey] = {};
        mergedData = JSON.parse(shared.common.getValue(optionKey, `{}`));
        sizes = {
          ct: 0,
          df: 0,
          dh: 0,
          dt: 0,
          gb: 0,
          gdttt: 0,
          gf: 0,
          tf: 0,
          ggl: 0,
          main: 0,
          pm: 0,
          total: 0,
          ust: 0
        };
        mainFound = false;
        for (let mergedDataKey in mergedData) {
          if (mergedData.hasOwnProperty(mergedDataKey)) {
            let newData = {};
            let toDelete = 0;
            let foundSub = 0;
            let deletedSub = 0;
            let found = null;
            let toExport = false;
            for (let value in values) {
              if (values.hasOwnProperty(value)) {
                if (gSettings[`${dm.type}_${optionKey}_${value}`]) {
                  toDelete += 1;
                }
                for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                  let valueKey = values[value][j];
                  let mergedDataValue = mergedData[mergedDataKey][valueKey];
                  if (typeof mergedDataValue !== `undefined`) {
                    if (value !== `main`) {
                      foundSub += 1;
                    }
                    if (dm.autoBackup || gSettings[`${dm.type}_${optionKey}_${value}`] || value === `main`) {
                      newData[valueKey] = mergedDataValue;
                      if (value !== `main`) {
                        toExport = true;
                      }
                    }
                    let size = `"${valueKey}":${JSON.stringify(mergedDataValue)},`.length;
                    sizes[value] += size;
                    sizes.total += size;
                    found = value;
                    if (!space && dm.delete && gSettings[`${dm.type}_${optionKey}_${value}`] && value !== `main`) {
                      deletedSub += 1;
                      delete mergedData[mergedDataKey][valueKey];
                    }
                  }
                }
              }
            }
            if (found) {
              sizes[found] -= 1;
              sizes.total -= 1;
            }
            if (dm.autoBackup || toExport || gSettings[`${dm.type}_${optionKey}_main`]) {
              data[optionKey][mergedDataKey] = newData;
              mainFound = true;
            }
            let size = `"${mergedDataKey}":{},`.length;
            sizes.main += size;
            sizes.total += size;
            if (!space && dm.delete && ((gSettings[`${dm.type}_${optionKey}_main`] && foundSub === deletedSub) || toDelete === Object.keys(values).length)) {
              delete mergedData[mergedDataKey];
            }
          }
        }
        if (!space) {
          if (dm.import) {
            let newData = dm.data[optionKey];
            if (newData) {
              for (let newDataKey in newData) {
                if (newData.hasOwnProperty(newDataKey)) {
                  if (!mergedData[newDataKey]) {
                    mergedData[newDataKey] = {};
                  }
                  for (let value in values) {
                    if (values.hasOwnProperty(value)) {
                      if (gSettings[`${dm.type}_${optionKey}_${value}`]) {
                        if (gSettings.importAndMerge) {
                          for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                            let valueKey = values[value][j];
                            switch (valueKey) {
                              case `tags`:
                                if (mergedData[newDataKey].tags) {
                                  let tags = newData[newDataKey].tags;
                                  for (let k = 0, numTags = tags.length; k < numTags; ++k) {
                                    let tag = tags[k];
                                    if (mergedData[newDataKey].tags.indexOf(tag) < 0) {
                                      mergedData[newDataKey].tags.push(tag);
                                    }
                                  }
                                } else {
                                  mergedData[newDataKey].tags = newData[newDataKey].tags;
                                }
                                break;
                              case `readComments`:
                                if (mergedData[newDataKey].readComments) {
                                  for (let id in mergedData[newDataKey].readComments) {
                                    if (mergedData[newDataKey].readComments.hasOwnProperty(id)) {
                                      if (newData[newDataKey].readComments[id] > mergedData[newDataKey].readComments[id]) {
                                        mergedData[newDataKey].readComments[id] = newData[newDataKey].readComments[id];
                                      }
                                    }
                                  }
                                } else {
                                  mergedData[newDataKey].readComments = newData[newDataKey].readComments;
                                }
                                break;
                              default:
                                mergedData[newDataKey][valueKey] = newData[newDataKey][valueKey];
                                break;
                            }
                          }
                        } else {
                          for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                            let valueKey = values[value][j];
                            mergedData[newDataKey][valueKey] = newData[newDataKey][valueKey];
                          }
                        }
                      }
                    }
                  }
                }
              }
              await shared.common.setValue(optionKey, JSON.stringify(mergedData));
            }
          } else if (dm.delete) {
            await shared.common.setValue(optionKey, JSON.stringify(mergedData));
          }
        }
        if (mainFound) {
          sizes.main -= 1;
          sizes.total -= 1;
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":{}}`.length;
          sizes.main += size;
          sizes.total += size;
          if (dm.switches) {
            for (let value in values) {
              if (values.hasOwnProperty(value)) {
                if (dm.switches[`${optionKey}_${value}`]) {
                  dm.switches[`${optionKey}_${value}`].size.textContent = shared.common.convertBytes(sizes[value]);
                }
              }
            }
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(sizes.total);
          }
          totalSize += sizes.total;
        }
        break;
      case `themes`:
        data.themes = {};
        for (const themeId of Object.keys(shared.esgst.features.themes.features)) {
          const theme = shared.common.getValue(themeId);
          if (theme) {
            data.themes[themeId] = theme;
          }
        }
        if (!space) {
          if (dm.import) {
            let newData = dm.data.themes;
            if (newData) {
              if (gSettings.importAndMerge) {
                for (const themeId in newData) {
                  data.themes[themeId] = newData[themeId];
                }
              } else {
                data.themes = newData;
              }
              for (const themeId in data.themes) {
                await shared.common.setValue(themeId, data.themes[themeId]);
              }
            }
          } else if (dm.delete) {
            for (const themeId in data.themes) {
              await shared.common.delValue(themeId);
            }
            data.themes = {};
          }
        }
        if (!dm.autoBackup) {
          let size = JSON.stringify(data.themes).length;
          totalSize += size;
          if (dm.switches) {
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(size);
          }
        }
        break;
      case `emojis`:
        data.emojis = JSON.parse(shared.common.getValue(`emojis`, `[]`));
        if (!space) {
          if (dm.import) {
            let newData = JSON.stringify(dm.data.emojis);
            if (newData) {
              if (gSettings.importAndMerge) {
                await shared.common.setValue(`emojis`, JSON.stringify(
                  Array.from(
                    new Set(
                      data.emojis.concat(
                        JSON.parse(shared.common.fixEmojis(newData))
                      )
                    )
                  )
                ));
              } else {
                await shared.common.setValue(`emojis`, shared.common.fixEmojis(newData));
              }
            }
          } else if (dm.delete) {
            await shared.common.delValue(`emojis`);
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":${shared.common.getValue(optionKey, `"[]"`)}}`.length;
          totalSize += size;
          if (dm.switches) {
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(size);
          }
        }
        break;
      case `entries`:
      case `templates`:
      case `savedReplies`:
        data[optionKey] = JSON.parse(shared.common.getValue(optionKey, `[]`));
        if (!space) {
          if (dm.import) {
            let newData = dm.data[optionKey];
            if (newData) {
              if (gSettings.importAndMerge) {
                let dataKey = optionKey === `entries` ? `timestamp` : `name`;
                mergedData = data[optionKey];
                for (let j = 0, numNew = newData.length; j < numNew; ++j) {
                  let newDataValue = newData[j];
                  let k, numMerged;
                  for (k = 0, numMerged = mergedData.length; k < numMerged && mergedData[k][dataKey] !== newDataValue[dataKey]; ++k) {
                  }
                  if (k < numMerged) {
                    mergedData[k] = newDataValue;
                  } else {
                    mergedData.push(newDataValue);
                  }
                }
                if (optionKey === `entries`) {
                  mergedData = sortArray(mergedData, false, `timestamp`);
                }
                await shared.common.setValue(optionKey, JSON.stringify(mergedData));
              } else {
                await shared.common.setValue(optionKey, JSON.stringify(newData));
              }
            }
          } else if (dm.delete) {
            await shared.common.delValue(optionKey);
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":${shared.common.getValue(optionKey, `[]`)}}`.length;
          totalSize += size;
          if (dm.switches) {
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(size);
          }
        }
        break;
      case `games`:
        values = {
          main: [`apps`, `packages`, `reducedCV`, `noCV`, `hidden`, `ignored`, `owned`, `wishlisted`, `followed`, `sgId`],
          gt: [`tags`],
          egh: [`entered`],
          itadi: [`itadi`]
        };
        data.games = {
          apps: {},
          subs: {}
        };
        mergedData = JSON.parse(shared.common.getValue(`games`, `{"apps":{},"subs":{}}`));
        sizes = {
          egh: 0,
          gt: 0,
          itadi: 0,
          main: 0,
          total: 0
        };
        mainFound = false;
        for (let mergedDataKey in mergedData.apps) {
          if (mergedData.apps.hasOwnProperty(mergedDataKey)) {
            let mergedDataValue = mergedData.apps[mergedDataKey];
            let newData = {};
            let toDelete = 0;
            let foundSub = 0;
            let deletedSub = 0;
            let found = null;
            let toExport = false;
            for (let value in values) {
              if (values.hasOwnProperty(value)) {
                if (gSettings[`${dm.type}_games_${value}`]) {
                  toDelete += 1;
                }
                for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                  let valueKey = values[value][j];
                  let newDataValue = mergedDataValue[valueKey];
                  if (typeof newDataValue !== `undefined`) {
                    if (value !== `main`) {
                      foundSub += 1;
                    }
                    if (dm.autoBackup || gSettings[`${dm.type}_games_${value}`] || value === `main`) {
                      newData[valueKey] = newDataValue;
                      if (value !== `main`) {
                        toExport = true;
                      }
                    }
                    let size = `"${valueKey}":${JSON.stringify(newDataValue)},`.length;
                    sizes[value] += size;
                    sizes.total += size;
                    found = value;
                    if (!space && dm.delete && gSettings[`${dm.type}_games_${value}`] && value !== `main`) {
                      deletedSub += 1;
                      delete mergedDataValue[valueKey];
                    }
                  }
                }
              }
            }
            if (found) {
              sizes[found] -= 1;
              sizes.total -= 1;
            }
            if (dm.autoBackup || toExport || gSettings[`${dm.type}_${optionKey}_main`]) {
              data.games.apps[mergedDataKey] = newData;
              mainFound = true;
            }
            let size = `"${mergedDataKey}":{},`.length;
            sizes.main += size;
            sizes.total += size;
            if (!space && dm.delete && ((gSettings[`${dm.type}_${optionKey}_main`] && foundSub === deletedSub) || toDelete === Object.keys(values).length)) {
              delete mergedData.apps[mergedDataKey];
            }
          }
        }
        if (mainFound) {
          sizes.main -= 1;
          sizes.total -= 1;
        }
        mainFound = false;
        for (let mergedDataKey in mergedData.subs) {
          if (mergedData.subs.hasOwnProperty(mergedDataKey)) {
            let mergedDataValue = mergedData.subs[mergedDataKey];
            let newData = {};
            let toDelete = 0;
            let foundSub = 0;
            let deletedSub = 0;
            let found = null;
            let toExport = false;
            for (let value in values) {
              if (values.hasOwnProperty(value)) {
                if (gSettings[`${dm.type}_games_${value}`]) {
                  toDelete += 1;
                }
                for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                  let valueKey = values[value][j];
                  let newDataValue = mergedDataValue[valueKey];
                  if (typeof newDataValue !== `undefined`) {
                    if (value !== `main`) {
                      foundSub += 1;
                    }
                    if (dm.autoBackup || gSettings[`${dm.type}_games_${value}`] || value === `main`) {
                      newData[valueKey] = newDataValue;
                      if (value !== `main`) {
                        toExport = true;
                      }
                    }
                    let size = `"${valueKey}":${JSON.stringify(newDataValue)},`.length;
                    sizes[value] += size;
                    sizes.total += size;
                    found = value;
                    if (!space && dm.delete && gSettings[`${dm.type}_games_${value}`] && value !== `main`) {
                      deletedSub += 1;
                      delete mergedDataValue[valueKey];
                    }
                  }
                }
              }
            }
            if (found) {
              sizes[found] -= 1;
              sizes.total -= 1;
            }
            if (dm.autoBackup || toExport || gSettings[`${dm.type}_${optionKey}_main`]) {
              data.games.subs[mergedDataKey] = newData;
              mainFound = true;
            }
            let size = `"${mergedDataKey}":{},`.length;
            sizes.main += size;
            sizes.total += size;
            if (!space && dm.delete && ((gSettings[`${dm.type}_${optionKey}_main`] && foundSub === deletedSub) || toDelete === Object.keys(values).length)) {
              delete mergedData.subs[mergedDataKey];
            }
          }
        }
        if (mainFound) {
          sizes.main -= 1;
          sizes.total -= 1;
        }
        if (!space) {
          if (dm.import) {
            let newData = dm.data.games;
            if (newData) {
              for (let newDataKey in newData.apps) {
                if (newData.apps.hasOwnProperty(newDataKey)) {
                  let newDataValue = newData.apps[newDataKey];
                  if (!mergedData.apps[newDataKey]) {
                    mergedData.apps[newDataKey] = {};
                  }
                  let mergedDataValue = mergedData.apps[newDataKey];
                  for (let value in values) {
                    if (gSettings[`${dm.type}_games_${value}`]) {
                      for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                        let valueKey = values[value][j];
                        if (typeof newDataValue[valueKey] !== `undefined`) {
                          if (gSettings.importAndMerge) {
                            switch (valueKey) {
                              case `entered`:
                                mergedDataValue.entered = true;
                                break;
                              case `itadi`:
                                if (mergedDataValue.itadi) {
                                  if (newDataValue.itadi.lastCheck > mergedDataValue.itadi.lastCheck) {
                                    mergedDataValue.itadi = newDataValue.itadi;
                                  }
                                } else {
                                  mergedDataValue.itadi = newDataValue.itadi;
                                }
                                break;
                              case `tags`:
                                if (mergedDataValue.tags) {
                                  let tags = newDataValue.tags;
                                  for (let k = 0, numTags = tags.length; k < numTags; ++k) {
                                    let tag = tags[k];
                                    if (mergedDataValue.tags.indexOf(tag) < 0) {
                                      mergedDataValue.tags.push(tag);
                                    }
                                  }
                                } else {
                                  mergedDataValue.tags = newDataValue.tags;
                                }
                                break;
                              default:
                                mergedDataValue[valueKey] = newDataValue[valueKey];
                                break;
                            }
                          } else {
                            mergedDataValue[valueKey] = newDataValue[valueKey];
                          }
                        }
                      }
                    }
                  }
                }
              }
              for (let newDataKey in newData.subs) {
                if (newData.subs.hasOwnProperty(newDataKey)) {
                  let newDataValue = newData.subs[newDataKey];
                  if (!mergedData.subs[newDataKey]) {
                    mergedData.subs[newDataKey] = {};
                  }
                  let mergedDataValue = mergedData.subs[newDataKey];
                  for (let value in values) {
                    if (gSettings[`${dm.type}_games_${value}`]) {
                      for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                        let valueKey = values[value][j];
                        if (typeof newDataValue[valueKey] !== `undefined`) {
                          if (gSettings.importAndMerge) {
                            switch (valueKey) {
                              case `entered`:
                                mergedDataValue.entered = true;
                                break;
                              case `itadi`:
                                if (mergedDataValue.itadi) {
                                  if (newDataValue.itadi.lastCheck > mergedDataValue.itadi.lastCheck) {
                                    mergedDataValue.itadi = newDataValue.itadi;
                                  }
                                } else {
                                  mergedDataValue.itadi = newDataValue.itadi;
                                }
                                break;
                              case `tags`:
                                if (mergedDataValue.tags) {
                                  let tags = newDataValue.tags;
                                  for (let k = 0, numTags = tags.length; k < numTags; ++k) {
                                    let tag = tags[k];
                                    if (mergedDataValue.tags.indexOf(tag) < 0) {
                                      mergedDataValue.tags.push(tag);
                                    }
                                  }
                                } else {
                                  mergedDataValue.tags = newDataValue.tags;
                                }
                                break;
                              default:
                                mergedDataValue[valueKey] = newDataValue[valueKey];
                                break;
                            }
                          } else {
                            mergedDataValue[valueKey] = newDataValue[valueKey];
                          }
                        }
                      }
                    }
                  }
                }
              }
              await shared.common.setValue(`games`, JSON.stringify(mergedData));
            }
          } else if (dm.delete) {
            await shared.common.setValue(`games`, JSON.stringify(mergedData));
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":{"apps":{},"subs":{}}}`.length;
          sizes.main += size;
          sizes.total += size;
          if (dm.switches) {
            for (let value in values) {
              if (values.hasOwnProperty(value)) {
                if (dm.switches[`${optionKey}_${value}`]) {
                  dm.switches[`${optionKey}_${value}`].size.textContent = shared.common.convertBytes(sizes[value]);
                }
              }
            }
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(sizes.total);
          }
          totalSize += sizes.total;
        }
        break;
      case `groups`:
        values = {
          main: [`avatar`, `code`, `member`, `name`, `steamId`],
          gpt: [`tags`],
          sgg: [`stickied`]
        };
        mergedData = JSON.parse(shared.common.getValue(optionKey, `[]`));
        if (!Array.isArray(mergedData)) {
          let temp = [];
          for (let key in mergedData) {
            if (mergedData.hasOwnProperty(key)) {
              temp.push(mergedData[key]);
            }
          }
          mergedData = temp;
        }
        data[optionKey] = [];
        sizes = {
          main: 0,
          gpt: 0,
          sgg: 0,
          total: 0
        };
        mainFound = false;
        for (let j = mergedData.length - 1; j > -1; --j) {
          let newData = {};
          let toDelete = 0;
          let foundSub = 0;
          let deletedSub = 0;
          let found = null;
          let toExport = false;
          for (let value in values) {
            if (values.hasOwnProperty(value)) {
              if (gSettings[`${dm.type}_${optionKey}_${value}`]) {
                toDelete += 1;
              }
              for (let k = 0, numValues = values[value].length; k < numValues; ++k) {
                let valueKey = values[value][k];
                if (mergedData[j]) {
                  let mergedDataValue = mergedData[j][valueKey];
                  if (typeof mergedDataValue !== `undefined`) {
                    if (value !== `main`) {
                      foundSub += 1;
                    }
                    if (dm.autoBackup || gSettings[`${dm.type}_${optionKey}_${value}`] || value === `main`) {
                      newData[valueKey] = mergedDataValue;
                      if (value !== `main`) {
                        toExport = true;
                      }
                    }
                    let size = `"${valueKey}":${JSON.stringify(mergedDataValue)},`.length;
                    sizes[value] += size;
                    sizes.total += size;
                    found = value;
                    if (!space && dm.delete && gSettings[`${dm.type}_${optionKey}_${value}`] && value !== `main`) {
                      deletedSub += 1;
                      delete mergedData[j][valueKey];
                    }
                  }
                }
              }
            }
          }
          if (found) {
            sizes[found] -= 1;
            sizes.total -= 1;
          }
          if (dm.autoBackup || toExport || gSettings[`${dm.type}_${optionKey}_main`]) {
            data[optionKey].push(newData);
            mainFound = true;
          }
          let size = `{},`.length;
          sizes.main += size;
          sizes.total += size;
          if (!space && dm.delete && ((gSettings[`${dm.type}_${optionKey}_main`] && foundSub === deletedSub) || toDelete === Object.keys(values).length)) {
            mergedData.pop();
          }
        }
        if (mainFound) {
          sizes.main -= 1;
          sizes.total -= 1;
        }
        if (!space) {
          if (dm.import) {
            let newData = dm.data[optionKey];
            if (!Array.isArray(newData)) {
              let temp = [];
              for (let key in newData) {
                if (newData.hasOwnProperty(key)) {
                  temp.push(newData[key]);
                }
              }
              newData = temp;
            }
            if (newData) {
              for (let j = newData.length - 1; j > -1; --j) {
                let code = newData[j].code;
                let k, mergedDataValue;
                for (k = mergedData.length - 1; k > -1 && mergedData[k].code !== code; --k) {
                }
                if (k > -1) {
                  mergedDataValue = mergedData[k];
                } else {
                  mergedDataValue = {};
                  mergedData.push(mergedDataValue);
                }
                for (let value in values) {
                  if (values.hasOwnProperty(value)) {
                    if (gSettings[`${dm.type}_${optionKey}_${value}`]) {
                      for (let k = 0, numValues = values[value].length; k < numValues; ++k) {
                        let valueKey = values[value][k];
                        switch (valueKey) {
                          case `tags`:
                            if (mergedDataValue.tags) {
                              let tags = newData[j].tags;
                              for (let k = 0, numTags = tags.length; k < numTags; ++k) {
                                let tag = tags[k];
                                if (mergedDataValue.tags.indexOf(tag) < 0) {
                                  mergedDataValue.tags.push(tag);
                                }
                              }
                            } else {
                              mergedDataValue.tags = newData[j].tags;
                            }
                            break;
                          default:
                            mergedDataValue[valueKey] = newData[j][valueKey];
                            break;
                        }
                      }
                    }
                  }
                }
              }
              await shared.common.setValue(optionKey, JSON.stringify(mergedData));
            }
          } else if (dm.delete) {
            await shared.common.setValue(optionKey, JSON.stringify(mergedData));
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":[]}`.length;
          sizes.main += size;
          sizes.total += size;
          if (dm.switches) {
            for (let value in values) {
              if (values.hasOwnProperty(value)) {
                if (dm.switches[`${optionKey}_${value}`]) {
                  dm.switches[`${optionKey}_${value}`].size.textContent = shared.common.convertBytes(sizes[value]);
                }
              }
            }
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(sizes.total);
          }
          totalSize += sizes.total;
        }
        break;
      case `rerolls`:
      case `stickiedCountries`:
        data[optionKey] = JSON.parse(shared.common.getValue(optionKey, `[]`));
        if (!space) {
          if (dm.import) {
            let newData = dm.data[optionKey];
            if (newData) {
              if (gSettings.importAndMerge) {
                mergedData = data[optionKey];
                for (let j = 0, numNew = newData.length; j < numNew; ++j) {
                  let newDataValue = newData[j];
                  if (mergedData.indexOf(newDataValue) < 0) {
                    mergedData.push(newDataValue);
                  }
                }
                await shared.common.setValue(optionKey, JSON.stringify(mergedData));
              } else {
                await shared.common.setValue(optionKey, JSON.stringify(newData));
              }
            }
          } else if (dm.delete) {
            await shared.common.delValue(optionKey);
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":${shared.common.getValue(optionKey, `[]`)}}`.length;
          totalSize += size;
          if (dm.switches) {
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(size);
          }
        }
        break;
      case `sgCommentHistory`:
        data[optionKey] = JSON.parse(shared.common.getValue(optionKey, `[]`));
        if (!space) {
          if (dm.import) {
            let newData = dm.data[optionKey];
            if (newData) {
              if (gSettings.importAndMerge) {
                mergedData = [];
                let oldData = data[optionKey];
                let j = 0;
                let k = 0;
                let numNew = newData.length;
                let numOld = oldData.length;
                while (j < numOld && k < numNew) {
                  let oldDataValue = oldData[j];
                  let newDataValue = newData[k];
                  if (oldDataValue.timestamp > newDataValue.timestamp) {
                    mergedData.push(oldDataValue);
                    j += 1;
                  } else {
                    let l;
                    // noinspection JSUnusedAssignment
                    for (l = 0; l < numOld && oldData[l].id !== newDataValue.id; ++l) {
                    }
                    // noinspection JSUnusedAssignment
                    if (l >= numOld) {
                      mergedData.push(newDataValue);
                    }
                    k += 1;
                  }
                }
                while (j < numOld) {
                  mergedData.push(oldData[j]);
                  j += 1;
                }
                while (k < numNew) {
                  let newDataValue = newData[k];
                  let l;
                  // noinspection JSUnusedAssignment
                  for (l = 0; l < numOld && oldData[l].id !== newDataValue.id; ++l) {
                  }
                  // noinspection JSUnusedAssignment
                  if (l >= numOld) {
                    mergedData.push(newDataValue);
                  }
                  k += 1;
                }
                await shared.common.setValue(optionKey, JSON.stringify(mergedData));
              } else {
                await shared.common.setValue(optionKey, JSON.stringify(newData));
              }
            }
          } else if (dm.delete) {
            await shared.common.delValue(optionKey);
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":${shared.common.getValue(optionKey, `[]`)}}`.length;
          totalSize += size;
          if (dm.switches) {
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(size);
          }
        }
        break;
      case `users`:
        values = {
          main: [`whitelisted`, `whitelistedDate`, `blacklisted`, `blacklistedDate`],
          giveaways: [`giveaways`],
          namwc: [`namwc`],
          notes: [`notes`],
          nrf: [`nrf`],
          tags: [`tags`],
          uf: [`uf`],
          wbc: [`wbc`]
        };
        data.users = {
          steamIds: {},
          users: {}
        };
        mergedData = JSON.parse(shared.common.getValue(`users`, `{"steamIds":{},"users":{}}`));
        sizes = {
          giveaways: 0,
          namwc: 0,
          notes: 0,
          nrf: 0,
          main: 0,
          tags: 0,
          total: 0,
          uf: 0,
          wbc: 0
        };
        mainFound = false;
        mainUsernameFound = false;
        for (let mergedDataKey in mergedData.users) {
          if (mergedData.users.hasOwnProperty(mergedDataKey)) {
            let mergedDataValue = mergedData.users[mergedDataKey];
            let newData = {};
            let toDelete = 0;
            let foundSub = 0;
            let deletedSub = 0;
            let found = null;
            let toExport = false;
            for (let value in values) {
              if (values.hasOwnProperty(value)) {
                if (gSettings[`${dm.type}_users_${value}`]) {
                  toDelete += 1;
                }
                for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                  let valueKey = values[value][j];
                  if (typeof mergedDataValue[valueKey] !== `undefined`) {
                    if (value !== `main`) {
                      foundSub += 1;
                    }
                    if (dm.autoBackup || gSettings[`${dm.type}_users_${value}`] || value === `main`) {
                      newData[valueKey] = mergedDataValue[valueKey];
                      if (value !== `main`) {
                        toExport = true;
                      }
                    }
                    let size = `"${valueKey}":${JSON.stringify(mergedDataValue[valueKey])},`.length;
                    sizes[value] += size;
                    sizes.total += size;
                    found = value;
                    if (!space && dm.delete && gSettings[`${dm.type}_users_${value}`] && value !== `main`) {
                      deletedSub += 1;
                      delete mergedDataValue[valueKey];
                    }
                  }
                }
              }
            }
            if (found) {
              sizes[found] -= 1;
              sizes.total -= 1;
            }
            let id = mergedDataValue.id;
            let username = mergedDataValue.username;
            let size = 0;
            if (id) {
              size += `"id":"${id}",`.length;
            }
            if (username) {
              size += `"username":"${username}","${username}":"${mergedDataKey}",`.length;
            }
            if (dm.autoBackup || toExport || gSettings[`${dm.type}_${optionKey}_main`]) {
              if (id) {
                newData.id = id;
              }
              if (username) {
                newData.username = username;
                data.users.steamIds[username] = mergedDataKey;
                mainUsernameFound = true;
              }
              data.users.users[mergedDataKey] = newData;
              mainFound = true;
            }
            size += `"${mergedDataKey}":{},`.length;
            sizes.main += size;
            sizes.total += size;
            if (!space && dm.delete && ((gSettings[`${dm.type}_${optionKey}_main`] && foundSub === deletedSub) || toDelete === Object.keys(values).length)) {
              delete mergedData.steamIds[mergedDataValue.username];
              delete mergedData.users[mergedDataKey];
            }
          }
        }
        if (mainFound) {
          sizes.main -= 1;
          sizes.total -= 1;
        }
        if (mainUsernameFound) {
          sizes.main -= 1;
          sizes.total -= 1;
        }
        if (!space) {
          if (dm.import) {
            let newData = dm.data.users;
            if (newData) {
              for (let newDataKey in newData.users) {
                if (newData.users.hasOwnProperty(newDataKey)) {
                  let newDataValue = newData.users[newDataKey];
                  if (!mergedData.users[newDataKey]) {
                    mergedData.users[newDataKey] = {
                      id: newDataValue.id,
                      username: newDataValue.username
                    };
                    mergedData.steamIds[newDataValue.username] = newDataKey;
                  }
                  let mergedDataValue = mergedData.users[newDataKey];
                  for (let value in values) {
                    if (values.hasOwnProperty(value)) {
                      if (gSettings[`${dm.type}_users_${value}`]) {
                        for (let j = 0, numValues = values[value].length; j < numValues; ++j) {
                          let valueKey = values[value][j];
                          if (newDataValue[valueKey]) {
                            if (gSettings.importAndMerge) {
                              switch (valueKey) {
                                case `whitelisted`:
                                case `whitelistedDate`:
                                case `blacklisted`:
                                case `blacklistedDate`:
                                  mergedDataValue[valueKey] = newDataValue[valueKey];
                                  break;
                                case `notes`:
                                  mergedDataValue.notes = shared.common.removeDuplicateNotes(mergedDataValue.notes ? `${mergedDataValue.notes}\n\n${newDataValue.notes}` : newDataValue.notes);
                                  break;
                                case `tags`:
                                  if (mergedDataValue.tags) {
                                    let tags = newDataValue.tags;
                                    for (let k = 0, numTags = tags.length; k < numTags; ++k) {
                                      let tag = tags[k];
                                      if (mergedDataValue.tags.indexOf(tag) < 0) {
                                        mergedDataValue.tags.push(tag);
                                      }
                                    }
                                  } else {
                                    mergedDataValue.tags = newDataValue.tags;
                                  }
                                  break;
                                case `giveaways`:
                                  if (mergedDataValue.giveaways) {
                                    if (newDataValue.giveaways.wonTimestamp > mergedDataValue.giveaways.wonTimestamp) {
                                      mergedDataValue.giveaways.won = newDataValue.giveaways.won;
                                      mergedDataValue.giveaways.wonTimestamp = newDataValue.giveaways.wonTimestamp;
                                    }
                                    if (newDataValue.giveaways.sentTimestamp > mergedDataValue.giveaways.sentTimestamp) {
                                      mergedDataValue.giveaways.sent = newDataValue.giveaways.sent;
                                      mergedDataValue.giveaways.sentTimestamp = newDataValue.giveaways.sentTimestamp;
                                    }
                                  } else {
                                    mergedDataValue.giveaways = newDataValue.giveaways;
                                  }
                                  break;
                                default:
                                  if (mergedDataValue[valueKey]) {
                                    if (newDataValue[valueKey].lastCheck > mergedDataValue[valueKey].lastCheck) {
                                      mergedDataValue[valueKey] = newDataValue[valueKey];
                                    }
                                  } else {
                                    mergedDataValue[valueKey] = newDataValue[valueKey];
                                  }
                                  break;
                              }
                            } else {
                              mergedDataValue[valueKey] = newDataValue[valueKey];
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
              await shared.common.setValue(`users`, JSON.stringify(mergedData));
            }
          } else if (dm.delete) {
            await shared.common.setValue(`users`, JSON.stringify(mergedData));
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":{"steamIds":{},"users":{}}}`.length;
          sizes.main += size;
          sizes.total += size;
          if (dm.switches) {
            for (const value in values) {
              if (values.hasOwnProperty(value)) {
                if (dm.switches[`${optionKey}_${value}`]) {
                  dm.switches[`${optionKey}_${value}`].size.textContent = shared.common.convertBytes(sizes[value]);
                }
              }
            }
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(sizes.total);
          }
          totalSize += sizes.total;
        }
        break;
      case `winners`:
        data.winners = JSON.parse(shared.common.getValue(`winners`, `{}`));
        if (!space) {
          if (dm.import) {
            let newData = dm.data.winners;
            if (newData) {
              if (gSettings.importAndMerge) {
                mergedData = data.winners;
                for (let newDataKey in newData) {
                  if (newData.hasOwnProperty(newDataKey)) {
                    if (!mergedData[newDataKey]) {
                      mergedData[newDataKey] = [];
                    }
                    for (let j = 0, numNew = newData[newDataKey].length; j < numNew; ++j) {
                      let newDataValue = newData[newDataKey][j];
                      if (mergedData[newDataKey].indexOf(newDataValue) < 0) {
                        mergedData[newDataKey].push(newDataValue);
                      }
                    }
                  }
                }
                await shared.common.setValue(`winners`, JSON.stringify(mergedData));
              } else {
                await shared.common.setValue(`winners`, JSON.stringify(newData));
              }
            }
          } else if (dm.delete) {
            await shared.common.delValue(`winners`);
          }
        }
        if (!dm.autoBackup) {
          let size = `{"${optionKey}":${shared.common.getValue(optionKey, `{}`)}}`.length;
          totalSize += size;
          if (dm.switches) {
            dm.switches[optionKey].size.textContent = shared.common.convertBytes(size);
          }
        }
        break;
      default:
        break;
    }
  }
  if (!dm.autoBackup && dm.computerSpaceCount) {
    dm.computerSpaceCount.textContent = shared.common.convertBytes(totalSize);
  }
  if (space) {
    if (space.close) {
      space.close();
    }
    return totalSize;
  } else {
    if (dm.type === `export` || gSettings.exportBackup) {
      if (dropbox || (dm.type !== `export` && gSettings.exportBackupIndex === 1)) {
        await shared.common.delValue(`dropboxToken`);
        shared.common.openSmallWindow(`https://www.dropbox.com/oauth2/authorize?redirect_uri=https://www.steamgifts.com/account/settings/profile&response_type=token&state=dropbox&client_id=nix7kvchwa8wdvj`);
        // noinspection JSIgnoredPromiseFromCall
        checkDropboxComplete(data, dm, callback);
      } else if (googleDrive || (dm.type !== `export` && gSettings.exportBackupIndex === 2)) {
        await shared.common.delValue(`googleDriveToken`);
        shared.common.openSmallWindow(`https://accounts.google.com/o/oauth2/v2/auth?${gSettings.usePreferredGoogle ? `login_hint=${gSettings.preferredGoogle}&` : ``}redirect_uri=https://www.steamgifts.com/account/settings/profile&response_type=token&state=google-drive&client_id=102804278399-95kit5e09mdskdta7eq97ra7tuj20qps.apps.googleusercontent.com&scope=https://www.googleapis.com/auth/drive.appdata`);
        // noinspection JSIgnoredPromiseFromCall
        checkGoogleDriveComplete(data, dm, callback);
      } else if (oneDrive || (dm.type !== `export` && gSettings.exportBackupIndex === 3)) {
        await shared.common.delValue(`oneDriveToken`);
        shared.common.openSmallWindow(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${gSettings.usePreferredMicrosoft ? `login_hint=${gSettings.preferredMicrosoft}&` : ``}redirect_uri=https://www.steamgifts.com/account/settings/profile&response_type=token&state=onedrive&client_id=1781429b-289b-4e6e-877a-e50015c0af21&scope=files.readwrite`);
        // noinspection JSIgnoredPromiseFromCall
        checkOneDriveComplete(data, dm, callback);
      } else {
        const name = `${gSettings.askFileName ? window.prompt(`Enter the name of the file:`, `esgst_data_${new Date().toISOString().replace(/:/g, `_`)}`) : `esgst_data_${new Date().toISOString().replace(/:/g, `_`)}`}`;
        if (name === `null`) {
          callback();
          return;
        }
        if (gSettings.backupZip) {
          await shared.common.downloadZip(data, `${name}.json`, `${name}.zip`);
        } else {
          shared.common.downloadFile(JSON.stringify(data), `${name}.json`);
        }
        if (!dm.autoBackup) {
          shared.common.createFadeMessage(dm.message, `Data ${dm.pastTense} with success!`);
        }
        callback();
      }
    } else {
      shared.common.createFadeMessage(dm.message, `Data ${dm.pastTense} with success!`);
      callback();
    }
  }
}

export { loadDataCleaner, loadDataManagement };

