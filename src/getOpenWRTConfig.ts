import { DeviceSchema } from "./deviceSchema";
import {
  ExtensionSchema,
  ONCConfig,
  ONCDeviceConfig,
  Targets,
} from "./oncConfigSchema";
import semver from "semver";
import { OpenWRTConfig } from "./openWRTConfigSchema";
import { omit } from "lodash";

export const getOpenWRTConfig = ({
  oncConfig,
  deviceConfig,
  deviceSchema,
}: {
  oncConfig: ONCConfig;
  deviceConfig: ONCDeviceConfig;
  deviceSchema: DeviceSchema;
}) => {
  const swConfigVersionRange = deviceSchema.flags.swConfig
    .split(".")
    .map((n, index) => (index === 1 ? parseInt(n) : n))
    .join(".");

  const deviceVersion = deviceConfig.version
    .split(".")
    .map((n) => parseInt(n, 10))
    .join(".");

  const useSwConfig = !!semver.satisfies(deviceVersion, swConfigVersionRange);

  const cpuPort = (deviceSchema.ports || []).find(
    (port) => !!port.swConfigCpuName
  );

  const radios = deviceSchema.radios || [];

  const targetMatches = (targets?: Targets) => {
    const matches = targets
      ? typeof targets === "string" && targets === "*"
        ? true
        : targets.find((target) =>
            deviceConfig.tags.find((tag) =>
              tag.name === target.tag &&
              typeof target.value === "string" &&
              target.value === "*"
                ? true
                : Array.isArray(target.value)
                ? !!target.value.find((val) => tag.value.includes(val))
                : false
            )
          )
      : true;

    return matches;
  };

  const applyConfig = <S extends Record<string, any>>(section: S) => {
    const sectionConfig = section["."] as ExtensionSchema | undefined;
    const targets = sectionConfig?.targets;
    const matches = targetMatches(targets);
    const overrides = (sectionConfig?.target_overrides || [])
      .filter((override) => {
        return targetMatches(override.targets);
      })
      .reduce((acc, override) => {
        return { ...acc, ...override.overrides };
      }, {});
    return matches ? omit({ ...section, ...overrides }, ".") : {};
  };

  const networkDevices = oncConfig.config.network.device.filter((device) => {
    return targetMatches(device["."]?.targets);
  });

  const interfaces = oncConfig.config.network.interface.filter((interface_) => {
    return targetMatches(interface_["."]?.targets);
  });

  const openWRTConfig: OpenWRTConfig = {
    system: {
      system: [
        {
          properties: {
            ...applyConfig(oncConfig.config.system),
            ...deviceConfig.config.system,
          },
        },
      ],
    },
    network: {
      ...(useSwConfig && {
        switch: [
          {
            properties: {
              name: "switch0",
              reset: true,
              enable_vlan: true,
            },
          },
        ],
        switch_vlan: oncConfig.config.network.device
          .filter((device) => {
            return targetMatches(device["."]?.targets);
          })
          .reduce<any[]>((acc, device) => {
            const switchVlans = device.vlans.map((vlan) => {
              return {
                properties: {
                  device: "switch0",
                  vlan: vlan.id,
                  ports: (deviceSchema.ports || [])
                    .map((port) => {
                      const name = port.name.replace("eth", "");
                      return !!port.swConfigCpuName
                        ? `${name}t`
                        : vlan.ports === "*"
                        ? name
                        : `${name}t`;
                    })
                    .join(" "),
                },
              };
            });
            return [...acc, ...switchVlans];
          }, []),
      }),
      device: useSwConfig
        ? networkDevices.reduce<any[]>((acc, device) => {
            if (!cpuPort || !cpuPort.swConfigCpuName) {
              throw new Error("CPU port not defined.");
            }

            const c = device.vlans.map((vlan) => {
              return {
                properties: {
                  name: `${device.name}.${vlan.id}`,
                  type: device.type,
                  ports: [`${cpuPort.swConfigCpuName}.${vlan.id}`],
                },
              };
            });

            return [...acc, ...c];
          }, [])
        : networkDevices.map((device) => {
            return {
              name: device.name,
              properties: {
                ...applyConfig({
                  ...omit(device, "vlans"),
                  ports:
                    device.ports === "*"
                      ? (deviceSchema.ports || []).map((port) => port.name)
                      : [],
                }),
              },
            };
          }),
      interface: interfaces.map((interface_) => {
        return {
          name: interface_.name,
          properties: {
            ...applyConfig(interface_),
          },
        };
      }),
    },
    // ...(isRouter && {
    //   firewall: {
    //     defaults: [{ properties: oncConfig.firewall.defaults }],
    //     zone: oncConfig.firewall.zones.map((zone) => {
    //       return {
    //         properties: zone,
    //       };
    //     }),
    //     forwarding: oncConfig.firewall.forwardings.map((forwarding) => {
    //       return {
    //         properties: forwarding,
    //       };
    //     }),
    //     rule: oncConfig.firewall.rules.map((rule) => {
    //       return { properties: rule };
    //     }),
    //   },
    // }),
    // ...(radios.length > 0 && {
    //   wireless: {
    //     "wifi-device": radios.map((radio) => {
    //       const defaultBandChannels = {
    //         "2g": 1,
    //         "5g": 36,
    //       };
    //       return {
    //         name: radio.name,
    //         properties: {
    //           type: radio.type,
    //           path: radio.path,
    //           band: radio.band,
    //           channel: defaultBandChannels[radio.band],
    //           htmode: radio.htmodes[0],
    //         },
    //       };
    //     }),
    //     "wifi-iface": radios.reduce<any[]>((acc, radio, radioIndex) => {
    //       const wifiNetworks = oncConfig.wireless["wifi-iface"].map(
    //         (wifi, wifiIndex) => {
    //           const name = `wifinet${radioIndex}${wifiIndex}`;
    //           return {
    //             name,
    //             properties: {
    //               device: radio.name,
    //               mode: "ap",
    //               network: wifi.network,
    //               ssid: wifi.ssid,
    //               encryption: wifi.encryption,
    //               key: wifi.key,
    //             },
    //           };
    //         }
    //       );
    //       return [...acc, ...wifiNetworks];
    //     }, []),
    //   },
    // }),
  };

  return openWRTConfig;
};
