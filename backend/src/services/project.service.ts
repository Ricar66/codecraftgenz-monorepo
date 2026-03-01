import { projectRepository } from '../repositories/project.repository.js';
import { AppError } from '../utils/AppError.js';
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js';

export const projectService = {
  async getAll() {
    const projects = await projectRepository.findAll();
    return projects.map(mapProject);
  },

  async getById(id: number) {
    const project = await projectRepository.findById(id);
    if (!project) {
      throw AppError.notFound('Projeto');
    }
    return mapProject(project);
  },

  async getByStatus(status: string) {
    const projects = await projectRepository.findByStatus(status);
    return projects.map(mapProject);
  },

  async create(data: CreateProjectInput) {
    const project = await projectRepository.create(data);
    return mapProject(project);
  },

  async update(id: number, data: UpdateProjectInput) {
    const exists = await projectRepository.exists(id);
    if (!exists) {
      throw AppError.notFound('Projeto');
    }

    const project = await projectRepository.update(id, data);
    return mapProject(project);
  },

  async delete(id: number) {
    const exists = await projectRepository.exists(id);
    if (!exists) {
      throw AppError.notFound('Projeto');
    }

    await projectRepository.delete(id);
  },

  async assignMentor(projectId: number, mentorId: number) {
    const exists = await projectRepository.exists(projectId);
    if (!exists) {
      throw AppError.notFound('Projeto');
    }

    const project = await projectRepository.assignMentor(projectId, mentorId);
    return mapProject(project);
  },
};

function mapProject(project: {
  id: number;
  nome: string;
  owner: string | null;
  descricao: string | null;
  status: string;
  preco: unknown;
  progresso: number;
  dataInicio: string | null;
  thumbUrl: string | null;
  tagsJson?: string | null;
  mentorId: number | null;
  createdAt: Date;
  updatedAt: Date;
  mentor?: { id: number; nome: string; especialidade?: string | null; bio?: string | null } | null;
}) {
  // Parse tecnologias do JSON
  let tecnologias: string[] = [];
  if (project.tagsJson) {
    try {
      tecnologias = JSON.parse(project.tagsJson);
    } catch {
      tecnologias = [];
    }
  }

  return {
    id: project.id,
    nome: project.nome,
    owner: project.owner,
    descricao: project.descricao,
    status: project.status,
    preco: Number(project.preco),
    progresso: project.progresso,
    data_inicio: project.dataInicio,
    thumb_url: project.thumbUrl,
    tecnologias: tecnologias,
    mentor_id: project.mentorId,
    mentor: project.mentor
      ? {
          id: project.mentor.id,
          nome: project.mentor.nome,
          especialidade: project.mentor.especialidade,
          bio: project.mentor.bio,
        }
      : null,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  };
}
