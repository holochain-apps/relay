{
  description = "Template for Holochain app development";

  inputs = {
    p2p-shipyard.url = "github:darksoil-studio/p2p-shipyard";
    holochain-nix-versions.url =
      "github:holochain/holochain/?dir=versions/0_3_rc";
    holochain-flake = {
      url = "github:holochain/holochain";
      inputs.versions.follows = "holochain-nix-versions";
    };

    nixpkgs.follows = "holochain-flake/nixpkgs";
    flake-parts.follows = "holochain-flake/flake-parts";
  };

  outputs = inputs@{ flake-parts, holochain-flake, ... }:
    flake-parts.lib.mkFlake {
      specialArgs.nonWasmCrates = [ "relay" ];
      inherit inputs;
    } {
      systems = builtins.attrNames holochain-flake.devShells;
      perSystem = { config, pkgs, system, inputs', ... }: {
        devShells.default = pkgs.mkShell {
          inputsFrom = [
            inputs'.p2p-shipyard.devShells.holochainTauriDev
            holochain-flake.devShells.${system}.holonix
          ];
          packages = [ pkgs.nodejs-18_x ];
        };
        devShells.androidDev = pkgs.mkShell {
          inputsFrom = [
            inputs'.p2p-shipyard.devShells.holochainTauriAndroidDev
            holochain-flake.devShells.${system}.holonix
          ];
          packages = [ pkgs.nodejs-18_x ];
        };
      };
    };
}