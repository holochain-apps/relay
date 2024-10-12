{
  description = "Template for Holochain app development";

  inputs = {
    holonix.url = "github:holochain/holonix/main-0.3";

    nixpkgs.follows = "holonix/nixpkgs";
    flake-parts.follows = "holonix/flake-parts";

    p2p-shipyard.url = "github:darksoil-studio/p2p-shipyard";
  };

  outputs = inputs:
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      systems = builtins.attrNames inputs.holonix.devShells;
      perSystem = { inputs', config, pkgs, system, ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [ 
            inputs'.p2p-shipyard.devShells.holochainTauriDev 
            inputs'.holonix.devShells.default
          ];
        };
        devShells.androidDev = pkgs.mkShell {
          inputsFrom = [ 
            inputs'.p2p-shipyard.devShells.holochainTauriAndroidDev 
            inputs'.holonix.devShells.default
          ];
        };
      };
    };
}
