export interface ITeamManagementData {
    TeamDivisions: ITeamDivisions[]
    TeamMembers: ITeamMember[]
}

export interface ITeamDivisions {
    divisionname: string
    numberofmembers: number
}

export interface ITeamMember {
    memberpublictoken: string
    membername: string
    memberemail: string
    divisionisinname: string
    divisionid: number
    role: string
    userSessionToken: string | undefined
}

export interface ITeamMemberTemplate {
    memberpublictoken: string
    membername: string
    memberemail: string
    divisionisinname: string
    divisionid: number
    role: string
    userSessionToken: string | undefined
    ProjectToken: string
    onRemove: (memberPublicToken: string) => void
    onChangeRole: (memberPublicToken: string, newRole: string) => void
    onChangeDivision: (memberPublicToken: string, newDivision: string) => void
}
