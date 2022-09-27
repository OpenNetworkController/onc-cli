import { z } from "zod";
import { firewallProtocols, firewallTargets, icmpTypes } from "./openWrtValues";

const schemaSchema = z.array(
  z.object({
    config: z.enum(["system", "network"]),
    sections: z.array(
      z.object({
        type: z.enum(["system", "device", "interface"]),
        properties: z.array(
          z.object({
            type: z.enum(["option", "collection"]),
            name: z.string(),
          })
        ),
      })
    ),
  })
);

type SchemaSchema = z.infer<typeof schemaSchema>;

const schema: SchemaSchema = [
  {
    config: "system",
    sections: [
      {
        type: "system",
        properties: [
          {
            type: "option",
            name: "hostname",
          },
          {
            type: "option",
            name: "timezone",
          },
        ],
      },
    ],
  },
  {
    config: "network",
    sections: [
      {
        type: "device",
        properties: [
          { type: "option", name: "name" },
          { type: "option", name: "type" },
          { type: "collection", name: "ports" },
        ],
      },
      {
        type: "interface",
        properties: [
          { type: "option", name: "device" },
          { type: "option", name: "proto" },
          { type: "option", name: "ipaddr" },
          { type: "option", name: "netmask" },
        ],
      },
    ],
  },
];

export const systemSystemSchema = z.object({
  hostname: z.string().optional(),
  timezone: z.string().optional(),
});

export const networkSwitchSchema = z.object({
  name: z.string(),
  reset: z.boolean(),
  enable_vlan: z.boolean(),
});

export const networkSwitchVlanSchema = z.object({
  device: z.string(),
  vlan: z.number(),
  ports: z.string(),
});

export const networkDeviceSchema = z.object({
  name: z.string(),
  type: z.enum(["bridge"]),
  ports: z.array(z.string()),
});

export const networkBridgeVlanSchema = z.object({
  device: z.string(),
  vlan: z.number(),
  ports: z.array(z.string()),
});

export const networkInterfaceSchema = z.object({
  name: z.string(),
  device: z.string(),
  proto: z.enum(["static", "dhcp", "pppoe"]),
  ipaddr: z.string().optional(),
  netmask: z.string().optional(),
});

export const firewallDefaultSchema = z.object({
  input: z.enum(firewallTargets),
  output: z.enum(firewallTargets),
  forward: z.enum(firewallTargets),
  synflood_protect: z.boolean().optional(),
});

export const firewallZoneSchema = z.object({
  name: z.string(),
  input: z.enum(firewallTargets),
  output: z.enum(firewallTargets),
  forward: z.enum(firewallTargets),
  masq: z.boolean().optional(),
  mtu_fix: z.boolean().optional(),
  network: z.array(z.string()),
});

export const firewallForwardingSchema = z.object({
  src: z.string(),
  dest: z.string(),
});

export const firewallRuleSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string(),
  proto: z.array(z.enum(firewallProtocols)).optional(),
  icmp_type: z.array(z.enum(icmpTypes)).optional(),
  src: z.string().optional(),
  src_ip: z.array(z.string()).optional(),
  dest: z.string().optional(),
  dest_port: z.union([z.string(), z.array(z.number())]).optional(),
  dest_ip: z.array(z.string()).optional(),
  family: z.enum(["any", "ipv4", "ipv6"]).optional(),
  target: z.enum(firewallTargets),
  limit: z.string().optional(),
});

export const wirelessWifiDeviceSchema = z.object({
  type: z.string(),
  path: z.string(),
  channel: z.number(),
  band: z.string(),
  htmode: z.string(),
});

export const wirelessWifiIfaceSchema = z.object({
  device: z.string(),
  mode: z.enum(["ap"]),
  network: z.string(),
  ssid: z.string(),
  encryption: z.string(),
  key: z.string(),
});

export const dhcpDnsmasqSchema = z.object({
  domainneeded: z.boolean(),
  localise_queries: z.boolean(),
  rebind_localhost: z.boolean(),
  local: z.string(),
  expandhosts: z.boolean(),
  authoritative: z.boolean(),
  readethers: z.boolean(),
  leasefile: z.string(),
  localservice: z.boolean(),
  ednspacket_max: z.number(),
  dnsforwardmax: z.number(),
  domain: z.string(),
  noresolv: z.boolean(),
  server: z.array(z.string()).optional(),
});

export const openWrtConfigSchema = z.object({
  system: z.object({
    system: z.array(
      z
        .object({
          name: z.string().optional(),
          properties: systemSystemSchema.strict(),
        })
        .strict()
    ),
  }),
  network: z.object({
    switch: z
      .array(
        z
          .object({
            name: z.string().optional(),
            properties: networkSwitchSchema.strict(),
          })
          .strict()
      )
      .optional(),
    switch_vlan: z
      .array(
        z
          .object({
            name: z.string().optional(),
            properties: networkSwitchVlanSchema.strict(),
          })
          .strict()
      )
      .optional(),
    device: z.array(
      z
        .object({
          name: z.string().optional(),
          properties: networkDeviceSchema.strict(),
        })
        .strict()
    ),
    "bridge-vlan": z
      .array(
        z
          .object({
            properties: networkBridgeVlanSchema.strict(),
          })
          .strict()
      )
      .optional(),
    interface: z.array(
      z
        .object({
          name: z.string().optional(),
          properties: networkInterfaceSchema.strict(),
        })
        .strict()
    ),
  }),
  firewall: z
    .object({
      defaults: z
        .array(
          z
            .object({
              name: z.string().optional(),
              properties: firewallDefaultSchema.strict(),
            })
            .strict()
        )
        .optional(),
      zone: z
        .array(
          z
            .object({
              name: z.string().optional(),
              properties: firewallZoneSchema.strict(),
            })
            .strict()
        )
        .optional(),
      forwarding: z
        .array(
          z
            .object({
              name: z.string().optional(),
              properties: firewallForwardingSchema.strict(),
            })
            .strict()
        )
        .optional(),
      rule: z
        .array(
          z
            .object({
              name: z.string().optional(),
              properties: firewallRuleSchema.strict(),
            })
            .strict()
        )
        .optional(),
    })
    .optional(),
  dhcp: z
    .object({
      dnsmasq: z
        .array(
          z
            .object({
              name: z.string().optional(),
              properties: dhcpDnsmasqSchema.strict(),
            })
            .strict()
        )
        .optional(),
    })
    .optional(),
  wireless: z
    .object({
      "wifi-device": z
        .array(
          z
            .object({
              name: z.string(),
              properties: wirelessWifiDeviceSchema.strict(),
            })
            .strict()
        )
        .optional(),
      "wifi-iface": z
        .array(
          z
            .object({
              name: z.string().optional(),
              properties: wirelessWifiIfaceSchema.strict(),
            })
            .strict()
        )
        .optional(),
    })
    .strict()
    .optional(),
});

export type OpenWrtConfig = z.infer<typeof openWrtConfigSchema>;

// const parser = ({
//   configSchema,
//   config,
// }: {
//   configSchema: SchemaSchema;
//   config: ConfigSchemaSchema;
// }) => {
//   const configKeys = Object.keys(config);
//   const errors = configKeys.reduce<any[]>((acc, configKey) => {
//     const sectionKeys = Object.keys((config as any)[configKey]);
//     const sectionsErrors = sectionKeys.reduce<any[]>((acc, sectionKey) => {
//       const sections = (config as any)[configKey][sectionKey] as any[];
//       const sectionErrors = sections.reduce((acc, section) => {
//         const { name, properties } =
//           section.length === 2
//             ? { name: section[0], properties: section[1] }
//             : { name: undefined, properties: section[0] };

//         return [...acc, { error: "hi" }];
//       }, []);
//       return [...acc, ...sectionErrors];
//     }, []);
//     return [...acc, ...sectionsErrors];
//   }, []);

//   console.log({ errors });
// };