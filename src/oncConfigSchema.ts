import { z } from "zod";
import {
  dhcpDnsmasqSchema,
  firewallDefaultSchema,
  firewallForwardingSchema,
  firewallRuleSchema,
  firewallZoneSchema,
  networkDeviceSchema,
  networkInterfaceSchema,
  systemSystemSchema,
  wirelessWifiIfaceSchema,
} from "./openWRTConfigSchema";

const targetsSchema = z.union([
  z.enum(["*"]),
  z.array(
    z.object({
      tag: z.string(),
      value: z.union([z.enum(["*"]), z.array(z.string())]),
    })
  ),
]);

export type Targets = z.infer<typeof targetsSchema>;

const getExtensionSchema = (schema?: z.ZodObject<any>) => {
  const extensionSchema = z.object({
    targets: targetsSchema.optional(),
    target_overrides: z
      .array(
        z.object({
          targets: targetsSchema,
          overrides: schema ? schema.partial() : z.any(),
        })
      )
      .optional(),
  });

  return extensionSchema;
};

const temp = getExtensionSchema();

export type ExtensionSchema = z.infer<typeof temp>;

const getTargetsExtension = (schema?: z.ZodObject<any>) => ({
  ".": getExtensionSchema(schema).optional(),
});

export const oncConfigSchema = z
  .object({
    devices: z.array(
      z
        .object({
          enabled: z.boolean().optional(),
          deviceModelId: z.string(),
          version: z.string(),
          ipaddr: z.string(),
          tags: z.array(
            z.object({
              name: z.string(),
              value: z.array(z.string()),
            })
          ),
          provisioning_config: z
            .object({
              ssh_auth: z.object({
                username: z.string(),
                password: z.string(),
              }),
            })
            .optional(),
          config: z.object({
            system: z.object({
              hostname: z.string(),
            }),
          }),
        })
        .strict()
    ),
    config: z.object({
      system: z
        .object({
          timezone: z.string(),
        })
        .extend(getTargetsExtension(systemSystemSchema))
        .strict(),
      network: z.object({
        device: z.array(
          networkDeviceSchema
            .extend({
              ports: z.enum(["*"]),
              vlans: z.array(
                z.object({
                  id: z.number(),
                  ports: z.enum(["*", "*t"]),
                })
              ),
            })
            .extend(getTargetsExtension(networkDeviceSchema))
            .strict()
        ),
        interface: z.array(
          networkInterfaceSchema
            .partial()
            .extend(getTargetsExtension(networkInterfaceSchema))
            .strict()
        ),
      }),
      firewall: z
        .object({
          defaults: firewallDefaultSchema
            .partial()
            .extend(getTargetsExtension(firewallDefaultSchema))
            .strict(),
          zones: z.array(
            firewallZoneSchema
              .partial()
              .extend(getTargetsExtension(firewallZoneSchema))
              .strict()
          ),
          forwardings: z.array(
            firewallForwardingSchema
              .partial()
              .extend(getTargetsExtension(firewallForwardingSchema))
              .strict()
          ),
          rules: z.array(
            firewallRuleSchema
              .partial()
              .extend(getTargetsExtension(firewallRuleSchema))
              .strict()
          ),
        })
        .extend(getTargetsExtension()),
      dhcp: z
        .object({
          dnsmasq: dhcpDnsmasqSchema
            .partial()
            .extend(getTargetsExtension(dhcpDnsmasqSchema))
            .strict(),
        })
        .partial()
        .extend(getTargetsExtension())
        .strict(),
      wireless: z
        .object({
          "wifi-iface": z.array(
            wirelessWifiIfaceSchema
              .partial()
              .extend(getTargetsExtension(wirelessWifiIfaceSchema))
              .omit({ device: true })
              .strict()
          ),
        })
        .partial()
        .extend(getTargetsExtension())
        .strict(),
    }),
  })
  .strict();

export type ONCConfig = z.infer<typeof oncConfigSchema>;

export type ONCDeviceConfig = ONCConfig["devices"][0];
