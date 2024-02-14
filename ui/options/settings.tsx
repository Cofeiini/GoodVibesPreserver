import * as React from "react";
import { Action } from "../../scripts/tools/messaging";

const CustomCheckbox = ({ settingName }: { settingName: string }) => {
    const [isChecked, setIsChecked] = React.useState(false);
    React.useEffect(() => {
        const getSettingStatus = async () => {
            const { [settingName]: value } = await browser.storage.local.get();
            setIsChecked(value);
        };
        getSettingStatus();
    }, []);
    return (
        <div className="custom-checkbox" style={{ backgroundColor: isChecked ? "rgb(210,210,210)" : "rgb(40,40,40)" }} onClick={() => {
            browser.runtime.sendMessage({ action: Action.setting, data: { content: { setting: settingName } } });
            setIsChecked(!isChecked);
        }}>
            <div className="checkbox-indicator" style={{
                transform: isChecked ? "translateX(40px)" : "translateX(0)",
            }}>
            </div>
        </div>
    );
};

const Setting = ({ settingName, settingText }: { settingName: string, settingText: string }) => {
    return (
        <>
            <hr/>
            <div className="setting">
                <label>{ settingText }</label>
                <CustomCheckbox settingName={ settingName }/>
            </div>
        </>
    );
};

export const SettingsSection = () => {
    return (
        <div className="settings-content">
            <h1 className="settings-title">Settings</h1>
            <div className="settings-list">
                <Setting settingName="extensionOn" settingText="Turn Extension Off/On"/>
                <Setting settingName="votingEnabled" settingText="Disable/Enable Voting"/>
            </div>
        </div>
    );
};
