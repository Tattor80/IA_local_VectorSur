export interface OllamaModel {
  name: string;
  modified_at: Date;
  size: number;
  details?: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaModelDetail {
  license: string,
  modelfile: string,
  parameters: string,
  template: string,
  system: string,
}

export enum OllamaModelID {
  DEFAULTMODEL = 'llama3:latest'
}

// in case the `DEFAULT_MODEL` environment variable is not set or set to an unsupported model
export const fallbackModelID = OllamaModelID.DEFAULTMODEL;

export const OllamaModels: Record<OllamaModelID, OllamaModel> = {
  [OllamaModelID.DEFAULTMODEL]: {
    name: 'llama3:latest',
    modified_at: new Date(),
    size: 16384,
  },
};
